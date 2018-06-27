import * as Bluebird from "bluebird";
import {DependencyGroup, ExecutionContext, LoboConfig, Reject, Resolve, VersionSpecification} from "./plugin";
import {createLogger, Logger} from "./logger";
import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";
import {createElmPackageHelper, ElmPackageHelper, ElmJson} from "./elm-package-helper";
import * as tmp from "tmp";
import * as _ from "lodash";

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

  public configBuildDirectory(loboDirectory: string, appDirectory: string): boolean {
    if (!fs.existsSync(loboDirectory)) {
      shelljs.mkdir(loboDirectory);
    }

    const loboDirectoryElmStuff = path.resolve(loboDirectory, "elm-stuff");
    const appElmStuffDirectory = path.resolve(appDirectory, "elm-stuff");

    if (fs.existsSync(appElmStuffDirectory) && !fs.existsSync(loboDirectoryElmStuff)) {
      shelljs.ln("-s", appElmStuffDirectory, loboDirectoryElmStuff);
    }

    const loboDirectoryElmPackage = path.resolve(loboDirectory, "elm.json");
    const appElmPackage = path.resolve(appDirectory, "elm.json");

    if (fs.existsSync(appElmPackage) && !fs.existsSync(loboDirectoryElmPackage)) {
      shelljs.cp(appElmPackage, loboDirectoryElmPackage);

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
        const loboElmPackageIsCopy = this.configBuildDirectory(context.config.loboDirectory, context.config.appDirectory);
        this.syncLoboTestElmPackage(context.config, loboElmPackageIsCopy);
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

  public syncLoboTestElmPackage(config: LoboConfig, loboElmPackageIsCopy: boolean): void {
    const appElmJson = this.elmPackageHelper.read(config.appDirectory);

    if (!appElmJson) {
      throw new Error("Unable to read the app elm.json file.");
    }

    const loboElmJson = this.elmPackageHelper.read(config.loboDirectory);

    if (!loboElmJson) {
      throw new Error("Unable to read the lobo test elm.json file.");
    }

    if (loboElmPackageIsCopy) {
      loboElmJson.sourceDirectories = [];
    }

    const testFramework = config.testFramework;
    this.updateDependencies(config.loboDirectory, loboElmJson, appElmJson);
    this.updateDependencyVersions(config.loboDirectory, loboElmJson, appElmJson);
    this.updateSourceDirectories(config.loboDirectory, loboElmJson, config.appDirectory, appElmJson,
                                 testFramework.config.sourceDirectories);
  }

  public updateContextForRun(context: ExecutionContext): void {
    const dir = path.resolve(context.config.loboDirectory);
    context.tempDirectory = tmp.dirSync({dir, prefix: "lobo-", discardDescriptor: true}).name;
    context.buildOutputFilePath = path.join(context.tempDirectory, "UnitTest.js");
    context.testSuiteOutputFilePath = path.join(context.tempDirectory, context.config.testMainElm);
  }

  public updateDependencies(loboDir: string, loboElmJson: ElmJson, appElmJson: ElmJson): void {
    const callback = (missingDependencies: DependencyGroup<VersionSpecification>, updateAction: () => ElmJson) => {
      const missing: string[] = _.keys(missingDependencies);

      if (missing.length === 0) {
        return;
      }

      this.logger.debug("Adding missing dependencies: " + missing.join(","));
      updateAction();
    };

    this.elmPackageHelper.updateDependencies(loboDir, loboElmJson, appElmJson.appDependencies, appElmJson.testDependencies, callback);
  }

  public updateDependencyVersions(loboDir: string, loboElmJson: ElmJson, appElmJson: ElmJson): void {
    const callback = (updatedDependencies: DependencyGroup<VersionSpecification>, updateAction: () => ElmJson) => {
      const updated: string[] = _.keys(updatedDependencies);

      if (updated.length === 0) {
        return;
      }

      this.logger.debug("Minimum constraints of existing dependencies updated");
      updateAction();
    };

    this.elmPackageHelper.updateDependencyVersions(loboDir, loboElmJson, appElmJson.appDependencies, appElmJson.testDependencies, callback);
  }

  public updateSourceDirectories(loboDir: string, loboElmJson: ElmJson, applicationDir: string, appElmJson: ElmJson,
                                 pluginSourceDirectories: string[]): void {
    const callback = (diff: string[], updateAction: () => ElmJson) => {
      if (diff.length === 0) {
        return;
      }

      updateAction();
    };

    this.elmPackageHelper
      .updateSourceDirectories(loboDir, loboElmJson, applicationDir, appElmJson.sourceDirectories, pluginSourceDirectories, callback);
  }
}

export function createOutputDirectoryManager(): OutputDirectoryManager {
  return new OutputDirectoryManagerImp(createElmPackageHelper(), createLogger());
}
