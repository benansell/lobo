import * as Bluebird from "bluebird";
import {ElmCodeInfo, ElmCodeLookup, ElmFunctionNode, ExecutionContext, Reject, Resolve} from "./plugin";
import {createLogger, Logger} from "./logger";
import {createElmParser, ElmParser} from "./elm-parser";
import * as path from "path";
import * as fs from "fs";
import {Stats} from "fs";
import {createElmNodeHelper, ElmNodeHelper} from "./elm-node-helper";
import {createElmPackageHelper, ElmPackageHelper} from "./elm-package-helper";

export interface FileInfo {
  filePath: string;
  isTestFile: boolean;
  stats: Stats;
}

export interface ElmCodeLookupManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class ElmCodeLookupManagerImp implements ElmCodeLookupManager {

  private readonly elmNodeHelper: ElmNodeHelper;
  private readonly elmPackageHelper: ElmPackageHelper;
  private readonly parser: ElmParser;
  private readonly logger: Logger;

  constructor(elmNodeHelper: ElmNodeHelper, elmPackageHelper: ElmPackageHelper, parser: ElmParser, logger: Logger) {
    this.elmNodeHelper = elmNodeHelper;
    this.elmPackageHelper = elmPackageHelper;
    this.parser = parser;
    this.logger = logger;
  }

  public findFiles(appDirectory: string, testDirectory: string, ignoredRelativeDirectories: string[]): FileInfo[] {
    const loboJson = this.elmPackageHelper.readLoboJson(appDirectory);

    if (!loboJson || !loboJson.sourceDirectories) {
      return [];
    }

    let files: FileInfo[] = [];
    const loboTestDirectory = path.resolve(testDirectory);
    const dirPath = path.join(__dirname, "..");
    const ignored = ignoredRelativeDirectories.map((x: string) => path.resolve(dirPath, x));

    for (const sd of loboJson.sourceDirectories) {
      const filePath = path.resolve(".lobo", sd);

      if (ignored.indexOf(filePath) === -1) {
        const isTestFile = filePath === loboTestDirectory;
        const sourceFiles = this.findFilesInPath(filePath, ".elm", isTestFile);
        files = files.concat(sourceFiles);
      }
    }

    return files;
  }

  public findFilesInPath(fileOrDirectoryPath: string, fileType: string, isTestFile: boolean): FileInfo[] {
    const stats = fs.lstatSync(fileOrDirectoryPath);

    if (stats.isDirectory()) {
      if (fileOrDirectoryPath.indexOf("elm-stuff") === -1 && fileOrDirectoryPath.indexOf(".lobo") === -1) {
        const fileArray = fs
          .readdirSync(fileOrDirectoryPath)
          .map(f => this.findFilesInPath(path.join(fileOrDirectoryPath, f), fileType, isTestFile));

        return Array.prototype.concat(...fileArray);
      } else {
        return [];
      }
    } else {
      if (stats && fileOrDirectoryPath.indexOf(fileType) === fileOrDirectoryPath.length - fileType.length) {
        return [{filePath: fileOrDirectoryPath, isTestFile, stats: stats}];
      } else {
        return [];
      }
    }
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    const steps: Array<(c: ExecutionContext) => Bluebird<ExecutionContext>> = [
      (c: ExecutionContext) => this.updateTests(c)
    ];

    let value: ExecutionContext = context;

    return Bluebird
      .mapSeries(steps, (item: (c: ExecutionContext) => Bluebird<ExecutionContext>) => item(value)
        .then((result: ExecutionContext) => value = this.syncHasDebugUsage(result)))
      .then(() => value);
  }

  public syncHasDebugUsage(context: ExecutionContext): ExecutionContext {
    context.hasDebugUsage = this.containsDebugModuleUsage(context.codeLookup);

    return context;
  }

  public containsDebugModuleUsage(codeLookup: ElmCodeLookup): boolean {
    for (const key in codeLookup) {
      if (codeLookup.hasOwnProperty(key)) {
        const codeInfo: ElmCodeInfo = codeLookup[key];

        if (!codeInfo || !codeInfo.moduleNode || !codeInfo.moduleNode.children) {
          continue;
        }

        for (const child of codeInfo.moduleNode.children) {
          if (!this.elmNodeHelper.isFunctionNode(child)) {
            continue;
          }

          const node = <ElmFunctionNode> child;

          for (const dep of node.dependencies) {
            if (dep.typeInfo.moduleName === "Debug") {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  public syncElmCodeLookupWithFileChanges(codeLookup: ElmCodeLookup, fileList: FileInfo[], testFrameworkElmModuleName: string)
    : ElmCodeLookup {
    const result: ElmCodeLookup = {};

    for (const fi of fileList) {
      const previousInfo = codeLookup[fi.filePath];

      if (previousInfo && previousInfo.lastModified >= fi.stats.mtime) {
        result[fi.filePath] = previousInfo;
      } else {
        result[fi.filePath] = this.toElmCodeInfo(testFrameworkElmModuleName, fi);
      }
    }

    return result;
  }

  public toElmCodeInfo(testFrameworkElmModuleName: string, pathInfo: FileInfo): ElmCodeInfo {
    const moduleNode = this.parser.parse(pathInfo.filePath, testFrameworkElmModuleName);
    const fileName = path.basename(pathInfo.filePath);
    const lastModified = pathInfo.stats.mtime;

    return {fileName, filePath: pathInfo.filePath, isTestFile: pathInfo.isTestFile, lastModified, moduleNode};
  }

  public updateTests(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      try {
        const testFrameworkName = context.config.testFramework.testFrameworkElmModuleName();
        const extraDirectories = context.config.testFramework.config.sourceDirectories;
        const files = this.findFiles(context.config.appDirectory, context.testDirectory, extraDirectories);
        context.codeLookup = this.syncElmCodeLookupWithFileChanges(context.codeLookup, files, testFrameworkName);
        resolve(context);
      } catch (err) {
        this.logger.error("Failed to find tests for generation of test suite", err);
        reject();
      }
    });
  }
}

export function createElmCodeLookupManager(): ElmCodeLookupManager {
  return new ElmCodeLookupManagerImp(createElmNodeHelper(), createElmPackageHelper(), createElmParser(), createLogger());
}
