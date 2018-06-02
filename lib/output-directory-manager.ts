import * as Bluebird from "bluebird";
import {ExecutionContext, LoboConfig, PluginTestFrameworkWithConfig, Reject, Resolve} from "./plugin";
import {createLogger, Logger} from "./logger";
import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";
import * as tmp from "tmp";
import {createElmPackageHelper, ElmPackageHelper, ElmPackageJson} from "./elm-package-helper";

export interface OutputDirectoryManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class OutputDirectoryManagerImp implements OutputDirectoryManager {

  private elmPackageHelper: ElmPackageHelper;
  private logger: Logger;

  constructor(elmPackageHelper: ElmPackageHelper, logger: Logger) {
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
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

  public generateBuildOutputFilePath(config: LoboConfig): string {
    const dir = path.resolve(config.loboDirectory);

    return tmp.tmpNameSync({dir, prefix: "lobo-test-", postfix: ".js"});
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      try {
        let testDir = path.dirname(context.testFile);
        const loboElmPackageIsCopy = this.configBuildDirectory(context.config.loboDirectory, context.testDirectory);
        this.syncLoboTestElmPackage(context.config, context.testDirectory, testDir, loboElmPackageIsCopy);
        context.buildOutputFilePath = this.generateBuildOutputFilePath(context.config);

        resolve(context);
      } catch (err) {
        const message = "Failed to configure lobo. " +
        `Please try deleting the lobo directory (${context.config.loboDirectory}) and re-run lobo`;
        this.logger.error(message, err);
        reject();
      }
    });
  }

  public syncLoboTestElmPackage(config: LoboConfig, testElmPackageDir: string, testDir: string, loboElmPackageIsCopy: boolean): void {
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
    this.updateSourceDirectories(testElmPackageDir, base, config.loboDirectory, testDir, target, testFramework.config.sourceDirectories);
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
                                 testDir: string, testElmPackage: ElmPackageJson, loboTestPluginSourceDirectories: string[]): void {
    const callback = (diff: string[], updateAction: () => ElmPackageJson) => {
      if (diff.length === 0) {
        return;
      }

      updateAction();
    };

    this.elmPackageHelper.updateSourceDirectories(baseElmPackageDir, baseElmPackage, testElmPackageDir, testDir,
                                                  testElmPackage, loboTestPluginSourceDirectories, callback);
  }
}

export function createOutputDirectoryManager(): OutputDirectoryManager {
  return new OutputDirectoryManagerImp(createElmPackageHelper(), createLogger());
}
