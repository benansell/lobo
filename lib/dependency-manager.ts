import * as Bluebird from "bluebird";
import chalk from "chalk";
import * as shelljs from "shelljs";
import * as promptly from "promptly";
import {createLogger, Logger} from "./logger";
import {DependencyGroup, ExecutionContext, LoboConfig, Reject, Resolve, VersionSpecification} from "./plugin";
import {createElmPackageHelper, ElmJson, ElmPackageHelper} from "./elm-package-helper";
import * as _ from "lodash";
import * as fs from "fs";
import {createElmCommandRunner, ElmCommandRunner} from "./elm-command-runner";
import {createUtil, Util} from "./util";

export interface DependencyManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class DependencyManagerImp implements DependencyManager {

  private readonly elmCommandRunner: ElmCommandRunner;
  private readonly elmPackageHelper: ElmPackageHelper;
  private readonly logger: Logger;
  private readonly util: Util;
  private readonly yOrN: string = chalk.dim(" [Y/n]");

  constructor(elmCommandRunner: ElmCommandRunner, elmPackageHelper: ElmPackageHelper, logger: Logger, util: Util) {
    this.elmCommandRunner = elmCommandRunner;
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
    this.util = util;
  }

  public ensureAppElmJsonExists(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      if (shelljs.test("-e", this.elmPackageHelper.pathElmJson(config.appDirectory))) {
        resolve();
        return;
      }

      if (!config.prompt) {
        this.elmCommandRunner.init(config, config.appDirectory, config.prompt, resolve, reject);
        return;
      }

      promptly.confirm(
        "Unable to find elm.json in the current directory" +
        "\n\nMay I run 'elm init' for you?" + this.yOrN,
        {"default": "yes"},
        (err, value) => {
          if (err) {
            reject(err);
          } else if (value && value.toString() === "true") {
            this.elmCommandRunner.init(config, config.appDirectory, config.prompt, resolve, reject);
          } else {
            reject();
          }
        });
    });
  }

  public ensureLoboElmJsonExists(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const loboDirElmJsonPath = this.elmPackageHelper.pathElmJson(config.loboDirectory);
      const appDirLoboJson = this.elmPackageHelper.pathLoboJson(config.appDirectory);

      if (fs.existsSync(loboDirElmJsonPath)) {
        shelljs.rm(loboDirElmJsonPath);
      }

      if (fs.existsSync(appDirLoboJson)) {
        shelljs.cp(appDirLoboJson, loboDirElmJsonPath);
        resolve();
        return;
      }

      if (!config.prompt) {
        this.runLoboElmInit(config, config.prompt, resolve, reject);
        return;
      }

      promptly.confirm(
        "Unable to find lobo.json in the current directory" +
        "\n\nMay I run 'elm init' for you?" + this.yOrN,
        {"default": "yes"},
        (err, value) => {
          if (err) {
            reject(err);
          } else if (value && value.toString() === "true") {
            this.runLoboElmInit(config, config.prompt, resolve, reject);
          } else {
            reject();
          }
        });
    });
  }

  public installDependencies(config: LoboConfig, prompt: boolean, packagesToInstall: string[]): Bluebird<void> {
    if (config.noInstall) {
      return new Bluebird((installResolve: Resolve<void>) => {
        this.util.logStage("INSTALL");

        for (const packageName of packagesToInstall) {
          this.logger.info(`Ignored running of elm install for '${packageName}' due to configuration`);
        }

        installResolve();
      });
    }

    return Bluebird.mapSeries(packagesToInstall, (packageName: string) => {
      return new Bluebird((installResolve: Resolve<void>, installReject: Reject) => {
        this.elmCommandRunner.install(config, packageName, prompt, installResolve, installReject);
      });
    }).return();
  }

  public readElmJson(config: LoboConfig): Bluebird<ElmJson> {
    return new Bluebird<ElmJson>((resolve: Resolve<ElmJson>, reject: Reject) => {
      const elmJson = this.elmPackageHelper.tryReadElmJson(config.appDirectory);

      if (!elmJson) {
        this.logger.error("Unable to read the elm.json file. Please check that is a valid json file");
        reject();
        return;
      }

      resolve(elmJson);
    });
  }

  public runLoboElmInit(config: LoboConfig, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    const callback = () => {
      try {
        this.elmPackageHelper.clean(config.loboDirectory);

        resolve();
      } catch (err) {
        const message = "Failed to init lobo app in the .lobo directory. " +
          `Please try deleting the lobo directory (${config.loboDirectory}) and re-run lobo`;
        this.logger.error(message, err);
        reject();
      }
    };

    this.elmCommandRunner.init(config, config.loboDirectory, prompt, callback, reject);
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    const steps = [
      () => this.ensureAppElmJsonExists(context.config),
      () => this.ensureLoboElmJsonExists(context.config)
    ];

    if (!context.config.noUpdate) {
      steps.push(() => this.syncUpdate(context.config, context.testDirectory));
    }

    return Bluebird
      .mapSeries(steps, (item: () => Bluebird<void>) => item())
      .return(context);
  }

  public syncDependencies(config: LoboConfig, elmJson: ElmJson): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const callback = (missing: string[]) => {
        if (missing.length === 0) {
          resolve();
          return;
        }

        if (!config.prompt) {
          this.installDependencies(config, false, missing)
            .then(() => resolve())
            .catch((e: Error) => reject(e));
          return;
        }

        promptly.confirm(
          "The dependencies of the lobo.json need to be updated to contain:\n" +
          missing.join("\n") + "\n\nMay I run elm install for you?" +
          this.yOrN,
          {"default": "yes"}, (err, value) => {
            if (err) {
              reject(err);
            } else if (value && value.toString() === "true") {
              this.installDependencies(config, config.prompt, missing)
                .then(() => resolve())
                .catch((e: Error) => reject(e));
            } else {
              reject();
            }
          });
      };

      const testFrameworkConfig = config.testFramework.config;
      this.elmPackageHelper.updateDependencies(config.loboDirectory, elmJson, testFrameworkConfig.dependencies, callback);
    });
  }

  public syncDependencyVersions(config: LoboConfig, elmJson: ElmJson): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const callback = (updatedDependencies: DependencyGroup<VersionSpecification>, updateAction: () => void) => {
        const updated: string[] = _.keys(updatedDependencies);

        if (updated.length === 0) {
          resolve();
          return;
        }

        if (!config.prompt) {
          updateAction();
          resolve();
          return;
        }

        promptly.confirm(
          "The existing dependency versions of lobo.json need to be updated for:\n" +
          updated.join("\n") + "\n\nMay I update the versions for you?" +
          this.yOrN,
          {"default": "yes"}, (err, value) => {
            if (err) {
              reject(err);
            } else if (value && value.toString() === "true") {
              updateAction();
              resolve();
            } else {
              reject();
            }
          });
      };

      const testFrameworkConfig = config.testFramework.config;
      this.elmPackageHelper.updateDependencyVersions(config.loboDirectory, elmJson, testFrameworkConfig.dependencies, callback);
    });
  }

  public syncSourceDirectories(config: LoboConfig, testDirectory: string, elmJson: ElmJson): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      try {
        let appSourceDirectories: string[] = [testDirectory];

        if (elmJson && this.elmPackageHelper.isApplicationJson(elmJson)) {
          appSourceDirectories = elmJson.sourceDirectories;
        } else {
          appSourceDirectories.push("src");
        }

        const callback = (diff: string[], updateAction: () => void) => {
          if (diff.length === 0) {
            return;
          }

          updateAction();
        };

        const pluginSourceDirectories = config.testFramework.config.sourceDirectories;
        this.elmPackageHelper.updateSourceDirectories(config.loboDirectory, config.appDirectory, appSourceDirectories,
                                                      pluginSourceDirectories, callback);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  public syncUpdate(config: LoboConfig, testDirectory: string): Bluebird<void> {
    const steps = [
      (elmJson: ElmJson) => this.syncSourceDirectories(config, testDirectory, elmJson),
      (elmJson: ElmJson) => this.syncDependencies(config, elmJson),
      () => this.updateLoboElmJson(config)
    ];

    return this.readElmJson(config)
      .then((result: ElmJson) => {
        if (!result) {
          throw new Error("Unable to read elm.json");
        }

        return Bluebird.mapSeries(steps, (item: (appElmJson: ElmJson) => Bluebird<void>) => item(result))
          .catch((err: Error) => {
            throw err;
          })
          .return();
      }).return();
  }

  public updateLoboElmJson(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      try {
        if (config.noUpdate) {
          resolve();
          return;
        }

        const loboDirectoryElmJson = this.elmPackageHelper.pathElmJson(config.loboDirectory);
        const loboJson = this.elmPackageHelper.pathLoboJson(config.appDirectory);
        shelljs.cp(loboDirectoryElmJson, loboJson);
        resolve();
      } catch (err) {
        const message = "Failed to update lobo.json. " +
          `Please close all usages of lobo.json in the app directory (${config.appDirectory}) and re-run lobo`;
        this.logger.error(message, err);
        reject();
      }
    });
  }
}

export function createDependencyManager(): DependencyManager {
  return new DependencyManagerImp(createElmCommandRunner(), createElmPackageHelper(), createLogger(), createUtil());
}
