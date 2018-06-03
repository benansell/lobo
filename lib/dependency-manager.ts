import * as Bluebird from "bluebird";
import * as _ from "lodash";
import chalk from "chalk";
import * as path from "path";
import * as shelljs from "shelljs";
import * as childProcess from "child_process";
import * as promptly from "promptly";
import {createLogger, Logger} from "./logger";
import {Dependencies, ExecutionContext, LoboConfig, PluginTestFrameworkWithConfig, Reject, Resolve} from "./plugin";
import {createElmPackageHelper, ElmPackageHelper} from "./elm-package-helper";

interface ElmPackageJson {
  dependencies: Dependencies;
  sourceDirectories: string[];
}

export interface ElmPackageCompare {
  readonly base: ElmPackageJson;
  readonly target: ElmPackageJson;
}

export interface DependencyManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class DependencyManagerImp implements DependencyManager {

  private readonly logger: Logger;
  private elmPackageHelper: ElmPackageHelper;
  private yOrN: string = chalk.dim(" [Y/n]");

  constructor(elmPackageHelper: ElmPackageHelper, logger: Logger) {
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    let baseElmPackageDir = ".";
    let testElmPackageDir = context.testDirectory;
    let steps: Array<() => Bluebird<void>> = [];

    if (context.config.noUpdate) {
      this.logger.info("Ignored sync of base and test elm-package.json files due to configuration");
    } else {
      steps = steps.concat([
        () => this.ensureElmPackageExists(context.config, baseElmPackageDir, "current"),
        () => this.ensureElmPackageExists(context.config, testElmPackageDir, "tests"),
        () => this.syncTestElmPackage(context.config, baseElmPackageDir, testElmPackageDir)]);
    }

    steps = steps.concat([
      () => this.installDependencies(context.config, context.testDirectory)
    ]);

    return Bluebird.mapSeries(steps, (item: () => Bluebird<ExecutionContext>) => item())
      .return(context);
  }

  public ensureElmPackageExists(config: LoboConfig, elmPackageDir: string, location: string): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      if (shelljs.test("-e", this.elmPackageHelper.path(elmPackageDir))) {
        resolve();
        return;
      }

      if (!config.prompt) {
        this.runElmPackageInstall(config, elmPackageDir, false, resolve, reject);
        return;
      }

      promptly.confirm(
        "Unable to find elm-package.json in the " + location + " directory" +
        "\n\nMay I create a minimal elm-package.json for you?" + this.yOrN,
        {"default": "yes"},
        (err, value) => {
          if (err) {
            reject(err);
          } else if (value && value.toString() === "true") {
            this.runElmPackageInstall(config, elmPackageDir, true, resolve, reject);
          } else {
            reject();
          }
        });
    });
  }

  public syncTestElmPackage(config: LoboConfig, baseElmPackageDir: string, testElmPackageDir: string): Bluebird<void> {
    let steps = <Array<(result: ElmPackageCompare) => Bluebird<ElmPackageCompare>>> [
      () => this.readElmPackage(baseElmPackageDir, testElmPackageDir),
      (result: ElmPackageCompare) =>
        this.updateSourceDirectories(config.prompt, baseElmPackageDir, result.base, testElmPackageDir, result.target),
      (result: ElmPackageCompare) =>
        this.updateDependencies(config.prompt, config.testFramework, result.base, testElmPackageDir, result.target)];

    let value: ElmPackageCompare;

    return Bluebird
      .mapSeries(steps, (item: (result: ElmPackageCompare) => Bluebird<ElmPackageCompare>) => item(value)
        .then((result: ElmPackageCompare) => value = result))
      .return();
  }

  public readElmPackage(baseElmPackageDir: string, testElmPackageDir: string): Bluebird<ElmPackageCompare> {
    return new Bluebird<ElmPackageCompare>((resolve: Resolve<ElmPackageCompare>, reject: Reject) => {
      let baseElmPackage = this.elmPackageHelper.read(baseElmPackageDir);

      if (!baseElmPackage) {
        this.logger.error("Unable to read the main elm-package.json file. Please check that is a valid json file");
        reject();
      }

      let testElmPackage = this.elmPackageHelper.read(testElmPackageDir);

      if (!testElmPackage) {
        this.logger.error("Unable to read the test elm-package.json file. Please check that is a valid json file");
        reject();
      }

      resolve(<ElmPackageCompare> {base: baseElmPackage, target: testElmPackage});
    });
  }

  public updateSourceDirectories(prompt: boolean, baseElmPackageDir: string, baseElmPackage: ElmPackageJson, testElmPackageDir: string,
                                 testElmPackage: ElmPackageJson): Bluebird<ElmPackageCompare> {
    return new Bluebird<ElmPackageCompare>((resolve: Resolve<ElmPackageCompare>, reject: Reject) => {

      const callback = (diff: string[], updateAction: () => ElmPackageJson) => {
        if (diff.length === 0) {
          resolve({base: baseElmPackage, target: testElmPackage});
          return;
        }

        if (!prompt) {
          testElmPackage = updateAction();
          resolve({base: baseElmPackage, target: testElmPackage});
          return;
        }

        promptly.confirm(
          "The source-directories of the test elm-package.json needs to be updated to " +
          "contain:\n" + diff.join("\n") + "\n\nMay I add them to elm-package.json for you?" +
          this.yOrN,
          {"default": "yes"},
          (err, value) => {
            if (err) {
              reject(err);
            } else if (value && value.toString() === "true") {
              testElmPackage = updateAction();
              resolve({base: baseElmPackage, target: testElmPackage});
            } else {
              reject();
            }
          });
      };

      this.elmPackageHelper
        .updateSourceDirectories(baseElmPackageDir, baseElmPackage, testElmPackageDir, testElmPackage, [], callback);
    });
  }

  public updateDependencies(prompt: boolean, testFramework: PluginTestFrameworkWithConfig, baseElmPackage: ElmPackageJson,
                            testElmPackageDir: string, testElmPackage: ElmPackageJson): Bluebird<ElmPackageCompare> {
    return new Bluebird<ElmPackageCompare>((resolve: Resolve<ElmPackageCompare>, reject: Reject) => {
      let callback = (diff: string[][], updateAction: () => ElmPackageJson) => {
        if (diff.length === 0) {
          resolve({base: baseElmPackage, target: testElmPackage});
          return;
        }

        let diffString = _.map(diff, kp => kp[0] + ": " + kp[1]);

        if (!prompt) {
          testElmPackage = updateAction();
          resolve({base: baseElmPackage, target: testElmPackage});
          return;
        }

        promptly.confirm(
          "The dependencies of the test elm-package.json need to be updated to contain:\n" +
          diffString.join("\n") + "\n\nMay I add them to elm-package.json for you--------?" +
          this.yOrN,
          {"default": "yes"}, (err, value) => {
            if (err) {
              reject(err);
            } else if (value && value.toString() === "true") {
              testElmPackage = updateAction();
              resolve({base: baseElmPackage, target: testElmPackage});
            } else {
              reject();
            }
          });
      };

      this.elmPackageHelper.updateDependencies(testFramework, baseElmPackage, testElmPackageDir, testElmPackage, callback);
    });
  }

  public installDependencies(config: LoboConfig, testDirectory: string): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      this.runElmPackageInstall(config, testDirectory, config.prompt, resolve, reject);
    });
  }

  public runElmPackageInstall(config: LoboConfig, directory: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    if (config.noInstall) {
      this.logger.info("Ignored running of elm-package install due to configuration");
      resolve();
      return;
    }

    let command = "elm-package";

    if (config.compiler) {
      command = path.join(config.compiler, command);
    }

    command += " install";

    if (!prompt) {
      command += " --yes";
    }

    try {
      // run as child process using current process stdio so that colored output is returned
      let options = {cwd: directory, stdio: [process.stdin, process.stdout, process.stderr]};
      this.logger.trace(command);
      childProcess.execSync(command, options);
      resolve();
    } catch (err) {
      this.logger.debug("elm package install failed in the test directory");
      this.logger.debug(err);
      reject(err);
    }
  }
}

export function createDependencyManager(): DependencyManager {
  return new DependencyManagerImp(createElmPackageHelper(), createLogger());
}
