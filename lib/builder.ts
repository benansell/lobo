import * as Bluebird from "bluebird";
import * as _ from "lodash";
import chalk from "chalk";
import * as path from "path";
import * as shelljs from "shelljs";
import * as childProcess from "child_process";
import * as promptly from "promptly";

import {createLogger, Logger} from "./logger";
import {Dependencies, LoboConfig, PluginTestFrameworkWithConfig, Reject, Resolve} from "./plugin";
import {createElmPackageHelper, ElmPackageHelper} from "./elm-package-helper";
import {createUtil, Util} from "./util";


interface ElmPackageJson {
  dependencies: Dependencies;
  sourceDirectories: string[];
}

interface ElmPackageCompare {
  readonly base: ElmPackageJson;
  readonly test: ElmPackageJson;
}


export interface Builder {
  build(config: LoboConfig, testDirectory: string, testFile: string): Bluebird<object>;
}

export class BuilderImp implements Builder {

  private logger: Logger;
  private elmPackageHelper: ElmPackageHelper;
  private util: Util;
  private yOrN: string = chalk.dim(" [Y/n]");

  constructor(elmPackageHelper: ElmPackageHelper, logger: Logger, util: Util) {
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
    this.util = util;
  }

  public build(config: LoboConfig, testDirectory: string, testFile: string): Bluebird<object> {
    this.logger.info("-----------------------------------[ BUILD ]------------------------------------");

    let baseElmPackageDir = ".";
    let testElmPackageDir = testDirectory;
    let testDir = path.dirname(testFile);
    let steps: Array<() => Bluebird<object>> = [];

    if (config.noUpdate) {
      this.logger.info("Ignored sync of base and test elm-package.json files due to configuration");
    } else {
      steps = steps.concat([() => this.ensureElmPackageExists(config, baseElmPackageDir, "current"),
        () => this.ensureElmPackageExists(config, testElmPackageDir, "tests"),
        () => this.syncTestElmPackage(config, baseElmPackageDir, testElmPackageDir, testDir)]);
    }

    steps = steps.concat([() => this.installDependencies(config, testDirectory), () => this.make(config, testDirectory, testFile)]);

    return Bluebird.mapSeries(steps, (item: () => Bluebird<object>) => item());
  }

  public ensureElmPackageExists(config: LoboConfig, elmPackageDir: string, location: string): Bluebird<object> {
    return new Bluebird((resolve: Resolve, reject: Reject) => {
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

  public syncTestElmPackage(config: LoboConfig, baseElmPackageDir: string, testElmPackageDir: string, testDir: string): Bluebird<object> {
    let steps: Array<(result?: ElmPackageCompare) => Bluebird<object>> = [() => this.readElmPackage(baseElmPackageDir, testElmPackageDir),
      (result: ElmPackageCompare) =>
        this.updateSourceDirectories(config, baseElmPackageDir, result.base, testElmPackageDir, testDir, result.test),
      (result: ElmPackageCompare) => this.updateDependencies(config, result.base, testElmPackageDir, result.test)];

    let value: ElmPackageCompare;

    return Bluebird.mapSeries(steps, (item: (result: ElmPackageCompare) => Bluebird<object>) => item(value)
      .then((result: ElmPackageCompare) => value = result));
  }

  public readElmPackage(baseElmPackageDir: string, testElmPackageDir: string): Bluebird<object> {
    return new Bluebird<object>((resolve: Resolve, reject: Reject) => {
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

      resolve({base: baseElmPackage, test: testElmPackage});
    });
  }

  public updateSourceDirectories(config: LoboConfig, baseElmPackageDir: string, baseElmPackage: ElmPackageJson, testElmPackageDir: string,
                                 testDir: string, testElmPackage: ElmPackageJson): Bluebird<object> {
    return new Bluebird((resolve: Resolve, reject: Reject) => {
      let sourceDirectories =
        this.mergeSourceDirectories(baseElmPackage, baseElmPackageDir, testElmPackage, testElmPackageDir, testDir, config.testFramework);
      let diff = _.difference(sourceDirectories, testElmPackage.sourceDirectories);

      if (diff.length === 0) {
        resolve({base: baseElmPackage, test: testElmPackage});
        return;
      }

      if (!config.prompt) {
        testElmPackage = this.updateSourceDirectoriesAction(sourceDirectories, testElmPackageDir, testElmPackage);
        resolve({base: baseElmPackage, test: testElmPackage});
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
            testElmPackage = this.updateSourceDirectoriesAction(sourceDirectories, testElmPackageDir, testElmPackage);
            resolve({base: baseElmPackage, test: testElmPackage});
          } else {
            reject();
          }
        });
    });
  }

  public updateSourceDirectoriesAction(sourceDirectories: string[], testElmPackageDir: string, testElmPackage: ElmPackageJson)
  : ElmPackageJson {
    testElmPackage.sourceDirectories = sourceDirectories;
    this.elmPackageHelper.write(testElmPackageDir, testElmPackage);

    return testElmPackage;
  }

  public updateDependencies(config: LoboConfig, baseElmPackage: ElmPackageJson, testElmPackageDir: string,
                            testElmPackage: ElmPackageJson): Bluebird<object> {
    return new Bluebird((resolve: Resolve, reject: Reject) => {
      let dependencies = this.mergeDependencies(baseElmPackage, testElmPackage, config.testFramework);
      let existing = _.toPairs(testElmPackage.dependencies);
      let diff = _.filter(dependencies, base => this.isNotExistingDependency(existing, base));

      if (diff.length === 0) {
        resolve({base: baseElmPackage, test: testElmPackage});
        return;
      }

      let diffString = _.map(diff, kp => kp[0] + ": " + kp[1]);

      if (!config.prompt) {
        testElmPackage = this.updateDependenciesAction(dependencies, testElmPackageDir, testElmPackage);
        resolve({base: baseElmPackage, test: testElmPackage});
        return;
      }

      promptly.confirm(
        "The dependencies of the test elm-package.json need to be updated to contain:\n" +
        diffString.join("\n") + "\n\nMay I add them to elm-package.json for you?" +
        this.yOrN,
        {"default": "yes"}, (err, value) => {
          if (err) {
            reject(err);
          } else if (value && value.toString() === "true") {
            testElmPackage = this.updateDependenciesAction(dependencies, testElmPackageDir, testElmPackage);
            resolve({base: baseElmPackage, test: testElmPackage});
          } else {
            reject();
          }
        });
    });
  }

  public updateDependenciesAction(dependencies: string[][], testElmPackageDir: string, testElmPackage: ElmPackageJson): ElmPackageJson {
    let sortedDependencies: string[][] = _.sortBy(dependencies, (kp: string[]) => kp[0]);
    testElmPackage.dependencies = _.fromPairs(sortedDependencies);
    this.elmPackageHelper.write(testElmPackageDir, testElmPackage);

    return testElmPackage;
  }

  public mergeSourceDirectories(baseElmPackage: ElmPackageJson, baseElmPackageDir: string, testElmPackage: ElmPackageJson,
                                testElmPackageDir: string, testDir: string, testFramework: PluginTestFrameworkWithConfig): string[] {
    let sourceDirs: string[] = _.clone(testElmPackage.sourceDirectories);

    if (!sourceDirs) {
      sourceDirs = [];
    }

    if (sourceDirs.indexOf(".") === -1) {
      sourceDirs.push(".");
    }

    if (sourceDirs.indexOf(testDir) === -1) {
      sourceDirs.push(testDir);
    }

    sourceDirs = this.addSourceDirectories(baseElmPackage.sourceDirectories, baseElmPackageDir, testElmPackageDir, sourceDirs);

    let dirPath = path.join(__dirname, "..");
    sourceDirs = this.addSourceDirectories(testFramework.config.sourceDirectories, dirPath, testElmPackageDir, sourceDirs);

    return sourceDirs;
  }

  public addSourceDirectories(additions: string[], additionDir: string, testElmPackageDir: string, sourceDirs: string[]): string[] {
    if (!additions) {
      return sourceDirs;
    }

    let relativePath = path.relative(testElmPackageDir, additionDir);
    let absoluteSourceDirs = _.map(sourceDirs, p => this.util.resolveDir(testElmPackageDir, p));

    let relativeSourceDirectories =
      _.map(additions, p => path.join(relativePath, p)
        .replace(/\\/g, "/"))
        .filter(p => absoluteSourceDirs.indexOf(this.util.resolveDir(testElmPackageDir, p)) === -1);

    return sourceDirs.concat(relativeSourceDirectories);
  }

  public mergeDependencies(baseElmPackage: ElmPackageJson, testElmPackage: ElmPackageJson,
                           testFramework: PluginTestFrameworkWithConfig): string[][] {
    let dependencies: string[][] = _.toPairs(testElmPackage.dependencies);

    if (baseElmPackage.dependencies) {
      let baseDependencies: string[][] = _.toPairs(baseElmPackage.dependencies)
        .filter((base: string[]) => this.isNotExistingDependency(dependencies, base));

      dependencies = dependencies.concat(baseDependencies);
    }

    if (testFramework.config.dependencies) {
      let testFrameworkDependencies = _.toPairs(testFramework.config.dependencies)
        .filter((base) => this.isNotExistingDependency(dependencies, base));

      dependencies = dependencies.concat(testFrameworkDependencies);
    }

    return dependencies;
  }

  public isNotExistingDependency(dependencies: string[][], candidate: string[]): boolean {
    return !_.find(dependencies, x => {
      return candidate[0] === x[0] && candidate[1] === x[1];
    });
  }

  public installDependencies(config: LoboConfig, testDirectory: string): Bluebird<object> {
    return new Bluebird((resolve: Resolve, reject: Reject) => {
      this.runElmPackageInstall(config, testDirectory, config.prompt, resolve, reject);
    });
  }

  public runElmPackageInstall(config: LoboConfig, directory: string, prompt: boolean, resolve: Resolve, reject: Reject): void {
    if (config.noInstall) {
      this.logger.info("Ignored running of elm-package due to configuration");
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

  public make(config: LoboConfig, testDirectory: string, testFile: string): Bluebird<object> {
    return new Bluebird((resolve: Resolve, reject: Reject) => {
      let pluginDirectory = path.resolve(__dirname, "..", "plugin");
      let testStuffMainElm = path.join(pluginDirectory, config.testFramework.config.name, config.testMainElm);
      let command = "elm-make";

      if (config.compiler) {
        command = path.join(config.compiler, command);
      }

      if (testFile !== "Tests.elm") {
        command += " " + testFile;
      }

      command += ` ${testStuffMainElm} --output=${config.testFile}`;

      if (!config.prompt) {
        command += " --yes";
      }

      if (!config.noWarn) {
        command += " --warn";
      }

      try {
        // run as child process using current process stdio so that colored output is returned
        let options = {cwd: testDirectory, stdio: [process.stdin, process.stdout, process.stderr]};
        this.logger.trace(command);
        childProcess.execSync(command, options);
        resolve();
      } catch (err) {
        this.logger.error("");
        this.logger.error(chalk.bold("  BUILD FAILED"));
        this.logger.error("");
        this.logger.debug(err);
        reject(err);
      }
    });
  }
}

export function createBuilder(): Builder {
  return new BuilderImp(createElmPackageHelper(), createLogger(), createUtil());
}
