import * as Bluebird from "bluebird";
import chalk from "chalk";
import * as shelljs from "shelljs";
import * as promptly from "promptly";
import {createLogger, Logger} from "./logger";
import {DependencyGroup, ExecutionContext, LoboConfig, Reject, Resolve, VersionSpecification} from "./plugin";
import {createElmPackageHelper, ElmJson, ElmPackageHelper} from "./elm-package-helper";
import {createUtil, Util} from "./util";
import * as _ from "lodash";

export interface DependencyManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class DependencyManagerImp implements DependencyManager {

  private readonly logger: Logger;
  private readonly elmPackageHelper: ElmPackageHelper;
  private readonly util: Util;
  private readonly yOrN: string = chalk.dim(" [Y/n]");

  constructor(elmPackageHelper: ElmPackageHelper, logger: Logger, util: Util) {
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
    this.util = util;
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    let steps: Array<() => Bluebird<void>> = [];

    steps = steps.concat([
        () => this.ensureAppElmJsonExists(context.config),
        () => this.syncDependencies(context.config),
        () => this.syncDependencyVersions(context.config)
    ]);

    return Bluebird.mapSeries(steps, (item: () => Bluebird<ExecutionContext>) => item())
      .return(context);
  }

  public ensureAppElmJsonExists(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      if (shelljs.test("-e", this.elmPackageHelper.path(config.appDirectory))) {
        resolve();
        return;
      }

      if (!config.prompt) {
        this.runElmInit(config, config.prompt, resolve, reject);
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
            this.runElmInit(config, config.prompt, resolve, reject);
          } else {
            reject();
          }
        });
    });
  }

  public syncDependencies(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const elmJson = this.elmPackageHelper.read(config.appDirectory);

      if (!elmJson) {
        this.logger.error("Unable to read the application elm.json file. Please check that is a valid json file");
        reject();
        return;
      }

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
          "The dependencies of the test elm.json need to be updated to contain:\n" +
          missing.join("\n") + "\n\nMay I run elm install for you?" +
          this.yOrN,
          {"default": "yes"}, (err, value) => {
            if (err) {
              reject(err);
            } else if (value && value.toString() === "true") {
              this.installDependencies(config, missing)
                .then(() => resolve())
                .catch((e: Error) => reject(e));
            } else {
              reject();
            }
          });
      };

      const testFrameworkConfig = config.testFramework.config;
      const noDeps = {direct: {}, indirect: {}};
      this.elmPackageHelper.updateDependencies(config.appDirectory, elmJson, testFrameworkConfig.dependencies, noDeps, callback);
    });
  }

  public syncDependencyVersions(config: LoboConfig): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      const elmJson = this.elmPackageHelper.read(config.appDirectory);

      if (!elmJson) {
        this.logger.error("Unable to read the application elm.json file. Please check that is a valid json file");
        reject();
        return;
      }

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
          "The existing dependency versions of the test elm.json need to be updated for:\n" +
          updated.join("\n") + "\n\nMay I run elm update the versions for you?" +
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
      const noDeps = {direct: {}, indirect: {}};
      this.elmPackageHelper.updateDependencyVersions(config.appDirectory, elmJson, testFrameworkConfig.dependencies, noDeps, callback);
    });
  }

  public installDependencies(config: LoboConfig, packagesToInstall: string[]): Bluebird<void> {
    return Bluebird.mapSeries(packagesToInstall, (packageName: string) => {
      return new Bluebird((installResolve: Resolve<void>, installReject: Reject) => {
        this.runElmPackageInstall(config, packageName, true, installResolve, installReject);
      });
    }).then();
  }

  public runElmInit(config: LoboConfig, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    try {
      this.util.runElmCommand(config, config.appDirectory, "init");
      resolve();
    } catch (err) {
      this.logger.debug("elm init failed");
      this.logger.debug(err);
      reject(err);
    }
  }

  public runElmPackageInstall(config: LoboConfig, packageName: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    if (config.noInstall) {
      this.logger.info(`Ignored running of elm install for '${packageName}' due to configuration`);
      resolve();
      return;
    }

    let action = "install ";

    try {
      this.util.runElmCommand(config, config.appDirectory, action + packageName);
      resolve();
    } catch (err) {
      this.logger.debug("elm install failed");
      this.logger.debug(err);
      reject(err);
    }
  }
}

export function createDependencyManager(): DependencyManager {
  return new DependencyManagerImp(createElmPackageHelper(), createLogger(), createUtil());
}
