import * as Bluebird from "bluebird";
import chalk from "chalk";
import * as shelljs from "shelljs";
import * as promptly from "promptly";
import {createLogger, Logger} from "./logger";
import {DependencyGroup, ExecutionContext, LoboConfig, Reject, Resolve, VersionSpecification} from "./plugin";
import {createElmPackageHelper, ElmApplicationJson, ElmJson, ElmPackageHelper} from "./elm-package-helper";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import {createElmCommandRunner, ElmCommandRunner} from "./elm-command-runner";

export interface DependencyManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class DependencyManagerImp implements DependencyManager {

  private readonly logger: Logger;
  private readonly elmCommandRunner: ElmCommandRunner;
  private readonly elmPackageHelper: ElmPackageHelper;
  private readonly yOrN: string = chalk.dim(" [Y/n]");

  constructor(elmCommandRunner: ElmCommandRunner, elmPackageHelper: ElmPackageHelper, logger: Logger) {
    this.elmCommandRunner = elmCommandRunner;
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
  }

  public configBuildDirectory(loboDirectory: string, appDirectory: string): boolean {
    const loboDirectoryElmPackage = path.resolve(loboDirectory, "elm.json");
    const appElmPackage = path.resolve(appDirectory, "lobo.json");

    if (fs.existsSync(appElmPackage) && !fs.existsSync(loboDirectoryElmPackage)) {
      shelljs.cp(appElmPackage, loboDirectoryElmPackage);

      return true;
    }

    return false;
  }

  public ensureAppElmJsonExists(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      if (shelljs.test("-e", this.elmPackageHelper.path(config.appDirectory))) {
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
      const loboDirectoryElmPackage = path.resolve(config.loboDirectory, "elm.json");
      const appElmPackage = path.resolve(config.appDirectory, "lobo.json");

      if (fs.existsSync(appElmPackage) && !fs.existsSync(loboDirectoryElmPackage)) {
        shelljs.cp(appElmPackage, loboDirectoryElmPackage);
        resolve();
        return;
      }

      if (!config.prompt) {
        this.runLoboElmInit(config, config.prompt, resolve, reject);
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
            this.runLoboElmInit(config, config.prompt, resolve, reject);
          } else {
            reject();
          }
        });
    });
  }

  // 1. Done - Ensure .lobo dir exists
  // 2. Done - Check for lobo.json - if not exist run elm init in .lobo, correct file; otherwise copy lobo.json to .lobo/elm.json
  // 3. Sync dependencies between elm.json and lobo.json by running elm install for each dep in .lobo
  // 4. Done - Copy .lobo/elm.json to lobo.json
  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    let steps = [
      () => this.ensureAppElmJsonExists(context.config),
      () => this.ensureLoboElmJsonExists(context.config)
    ];

    if (!context.config.noUpdate) {
      steps.push(() => this.syncUpdate(context.config));
    }

    return Bluebird
      .mapSeries(steps, (item: () => Bluebird<void>) => item())
      .return(context);
  }

  public syncUpdate(config: LoboConfig): Bluebird<void> {
    let steps = [
      (appElmJson: ElmJson) => this.syncSourceDirectories(config, appElmJson),
      (appElmJson: ElmJson) => this.syncDependencies(config, appElmJson),
      () => this.updateLoboElmJson(config)
    ];

    return this.readAppElmJson(config)
      .then((result: ElmJson) => {
        if (result) {
          throw new Error("Unable to read elm.json");
        }

        Bluebird.mapSeries(steps, (item: (config: LoboConfig, appElmJson: ElmJson) => Bluebird<void>) => item(config, result))
          .catch((err: Error) => {
            throw err;
          })
          .return();
      }).return();
  }

  public readAppElmJson(config: LoboConfig): Bluebird<ElmJson> {
    return new Bluebird<ElmJson>((resolve: Resolve<ElmJson>, reject: Reject) => {
      const elmJson = this.elmPackageHelper.read<ElmApplicationJson>(config.loboDirectory);

      if (!elmJson) {
        this.logger.error("Unable to read the elm.json file. Please check that is a valid json file");
        reject();
        return;
      }

      resolve(elmJson);
    });
  }

  public syncDependencies(config: LoboConfig, appElmJson: ElmJson): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const callback = (missingDependencies: DependencyGroup<VersionSpecification>, updateAction: () => ElmJson) => {
        const missing: string[] = _.keys(missingDependencies);

        if (missing.length === 0) {
          resolve();
          return;
        }

        if (!config.prompt) {
          updateAction();
          resolve();
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
      this.elmPackageHelper.updateDependencies(config.loboDirectory, appElmJson, testFrameworkConfig.dependencies, callback);
    });
  }

  public syncDependencyVersions(config: LoboConfig, appElmJson: ElmJson): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const callback = (updatedDependencies: DependencyGroup<VersionSpecification>, updateAction: () => ElmJson) => {
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
      this.elmPackageHelper.updateDependencyVersions(config.loboDirectory, appElmJson, testFrameworkConfig.dependencies, callback);
    });
  }

  public syncSourceDirectories(config: LoboConfig, appElmJson: ElmJson): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      try {
        let appSourceDirectories: string[] = [];

        if (appElmJson && this.elmPackageHelper.isApplicationJson(appElmJson)) {
          appSourceDirectories = appElmJson.sourceDirectories;
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

  public installDependencies(config: LoboConfig, prompt: boolean, packagesToInstall: string[]): Bluebird<void> {
    return Bluebird.mapSeries(packagesToInstall, (packageName: string) => {
      return new Bluebird((installResolve: Resolve<void>, installReject: Reject) => {
        this.elmCommandRunner.install(config, packageName, prompt, installResolve, installReject);
      });
    }).return();
  }

  public runLoboElmInit(config: LoboConfig, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    const callback = () => {
      try {
        const sourcePath = path.join(config.loboDirectory, "src");

        if (fs.existsSync(sourcePath)) {
          fs.rmdirSync(sourcePath);
        }

        this.elmPackageHelper.clean(config.loboDirectory);

        resolve();
      } catch (err) {
        const message = "Failed to init lobo app in temp directory. " +
          `Please try deleting the lobo directory (${config.loboDirectory}) and re-run lobo`;
        this.logger.error(message, err);
        reject();
      }
    };

    this.elmCommandRunner.init(config, config.loboDirectory, prompt, callback, reject);
  }

  public updateLoboElmJson(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      try {
        if (config.noUpdate) {
          resolve();
          return;
        }

        const loboDirectoryElmPackage = path.resolve(config.loboDirectory, "elm.json");
        const appElmPackage = path.resolve(config.appDirectory, "lobo.json");
        shelljs.cp(loboDirectoryElmPackage, appElmPackage);
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
  return new DependencyManagerImp(createElmCommandRunner(), createElmPackageHelper(), createLogger());
}
