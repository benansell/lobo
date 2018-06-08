import * as Bluebird from "bluebird";
import {ExecutionContext, LoboConfig, PluginTestFrameworkWithConfig, Reject, Resolve} from "./plugin";
import {createLogger, Logger} from "./logger";
import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";
import {createElmPackageHelper, ElmPackageHelper, ElmPackageJson} from "./elm-package-helper";
import * as tmp from "tmp";

export interface OutputDirectoryManager {
  cleanup(context: ExecutionContext): Bluebird<ExecutionContext>;
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class OutputDirectoryManagerImp implements OutputDirectoryManager {

  private elmPackageHelper: ElmPackageHelper;
  private logger: Logger;

  constructor(elmPackageHelper: ElmPackageHelper, logger: Logger) {
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
  }

  public cleanup(context: ExecutionContext): Bluebird<ExecutionContext> {
    if (context.config.noCleanup || !context.tempDirectory) {
      return Bluebird.resolve(context);
    }

    this.logger.debug("Cleaning lobo temp directory");

    if (context.buildOutputFilePath) {
      this.deleteTempFile(context.tempDirectory, context.buildOutputFilePath);
    }

    if (context.testSuiteOutputFilePath) {
      this.deleteTempFile(context.tempDirectory, context.testSuiteOutputFilePath);
    }

    this.deleteTempDir(context.tempDirectory);

    return Bluebird.resolve(context);
  }

  public configBuildDirectory(loboDirectory: string, testDirectory: string): boolean {
    if (!fs.existsSync(loboDirectory)) {
      shelljs.mkdir(loboDirectory);
    }

    const loboDirectoryElmStuff = path.resolve(loboDirectory, "elm-stuff");
    const testElmStuffDirectory = path.resolve(testDirectory, "elm-stuff");

    if (fs.existsSync(testElmStuffDirectory) && !fs.existsSync(loboDirectoryElmStuff)) {
      shelljs.ln("-s", testElmStuffDirectory, loboDirectoryElmStuff);
    }

    const loboDirectoryElmPackage = path.resolve(loboDirectory, "elm-package.json");
    const testElmPackage = path.resolve(testDirectory, "elm-package.json");

    if (fs.existsSync(testElmPackage) && !fs.existsSync(loboDirectoryElmPackage)) {
      shelljs.cp(testElmPackage, loboDirectoryElmPackage);

      return true;
    }

    return false;
  }

  public deleteTempDir(tempDir: string): void {
    try {
      if (path.basename(path.dirname(tempDir)) !== ".lobo") {
        this.logger.error("Unable to delete directories outside of the \".lobo\" directory");
        return;
      }

      if (!fs.existsSync(tempDir)) {
        return;
      }

      fs.rmdirSync(tempDir);
    } catch (err) {
      this.logger.debug(err);
    }
  }

  public deleteTempFile(tempDir: string, filePath: string): void {
    try {
      if (path.basename(path.dirname(path.dirname(filePath))) !== ".lobo") {
        this.logger.error("Unable to delete files outside of the \".lobo\" directory");
        return;
      }

      if (tempDir !== path.dirname(filePath)) {
        this.logger.error("Unable to delete files outside of the lobo temp directory");
        return;
      }

      if (!fs.existsSync(filePath)) {
        return;
      }

      fs.unlinkSync(filePath);
    } catch (err) {
      this.logger.debug(err);
    }
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      try {
        const loboElmPackageIsCopy = this.configBuildDirectory(context.config.loboDirectory, context.testDirectory);
        this.syncLoboTestElmPackage(context.config, context.testDirectory, loboElmPackageIsCopy);
        this.updateContextForRun(context);
        resolve(context);
      } catch (err) {
        const message = "Failed to configure lobo. " +
          `Please try deleting the lobo directory (${context.config.loboDirectory}) and re-run lobo`;
        this.logger.error(message, err);
        reject();
      }
    });
  }

  public syncLoboTestElmPackage(config: LoboConfig, testElmPackageDir: string, loboElmPackageIsCopy: boolean): void {
    const base = this.elmPackageHelper.read(testElmPackageDir);

    if (!base) {
      throw new Error("Unable to read the test elm-package.json file.");
    }

    const target = this.elmPackageHelper.read(config.loboDirectory);

    if (!target) {
      throw new Error("Unable to read the lobo test elm-package.json file.");
    }

    if (loboElmPackageIsCopy) {
      target.sourceDirectories = [];
    }

    const testFramework = config.testFramework;
    this.updateDependencies(testFramework, base, config.loboDirectory, target);
    this.updateSourceDirectories(testElmPackageDir, base, config.loboDirectory, target, testFramework.config.sourceDirectories);
  }

  public updateContextForRun(context: ExecutionContext): void {
    const dir = path.resolve(context.config.loboDirectory);
    context.tempDirectory = tmp.dirSync({dir, prefix: "lobo-", discardDescriptor: true}).name;
    context.buildOutputFilePath = path.join(context.tempDirectory, "UnitTest.js");
    context.testSuiteOutputFilePath = path.join(context.tempDirectory, context.config.testMainElm);
  }

  public updateDependencies(testFramework: PluginTestFrameworkWithConfig, baseElmPackage: ElmPackageJson, testElmPackageDir: string,
                            testElmPackage: ElmPackageJson): void {
    const callback = (diff: string[][], updateAction: () => ElmPackageJson) => {
      if (diff.length === 0) {
        return;
      }

      updateAction();
    };

    this.elmPackageHelper.updateDependencies(testFramework, baseElmPackage, testElmPackageDir, testElmPackage, callback);
  }

  public updateSourceDirectories(baseElmPackageDir: string, baseElmPackage: ElmPackageJson, testElmPackageDir: string,
                                 testElmPackage: ElmPackageJson, loboTestPluginSourceDirectories: string[]): void {
    const callback = (diff: string[], updateAction: () => ElmPackageJson) => {
      if (diff.length === 0) {
        return;
      }

      updateAction();
    };

    this.elmPackageHelper.updateSourceDirectories(baseElmPackageDir, baseElmPackage, testElmPackageDir,
                                                  testElmPackage, loboTestPluginSourceDirectories, callback);
  }
}

export function createOutputDirectoryManager(): OutputDirectoryManager {
  return new OutputDirectoryManagerImp(createElmPackageHelper(), createLogger());
}
