import * as Bluebird from "bluebird";
import {
  ElmCodeInfo,
  ElmCodeLookup,
  ExecutionContext,
  Reject,
  Resolve
} from "./plugin";
import {createLogger, Logger} from "./logger";
import {createElmParser, ElmParser} from "./elm-parser";
import * as path from "path";
import * as fs from "fs";
import {Stats} from "fs";

export interface FileInfo {
  filePath: string;
  isTestFile: boolean;
  stats: Stats;
}

export interface ElmCodeLookupManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class ElmCodeLookupManagerImp implements ElmCodeLookupManager {

  private parser: ElmParser;
  private logger: Logger;

  constructor(parser: ElmParser, logger: Logger) {
    this.parser = parser;
    this.logger = logger;
  }

  public findFiles(p: string, fileType: string, isTestFile: boolean): FileInfo[] {
    const stats = fs.lstatSync(p);

    if (stats.isDirectory()) {
      if (p.indexOf("elm-stuff") === -1) {
        const fileArray = fs.readdirSync(p).map(f => this.findFiles(path.join(p, f), fileType, isTestFile));
        return Array.prototype.concat(...fileArray);
      } else {
        return [];
      }
    } else {
      if (stats && p.indexOf(fileType) === p.length - fileType.length) {
        return [{filePath: p, isTestFile, stats: stats}];
      } else {
        return [];
      }
    }
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    let steps: Array<(c: ExecutionContext) => Bluebird<ExecutionContext>> = [
      (c: ExecutionContext) => this.updateTests(c)
    ];

    let value: ExecutionContext = context;

    return Bluebird
      .mapSeries(steps, (item: (c: ExecutionContext) => Bluebird<ExecutionContext>) => item(value)
        .then((result: ExecutionContext) => value = result))
      .then(() => value);
  }

  public syncElmCodeLookupWithFileChanges(codeLookup: ElmCodeLookup, fileList: FileInfo[], testFrameworkElmModuleName: string)
    : ElmCodeLookup {
    const result: ElmCodeLookup = {};

    for (const fi of fileList) {
      const previousInfo = codeLookup[fi.filePath];

      if (previousInfo && previousInfo.lastModified >= fi.stats.mtime) {
        result[fi.filePath] = previousInfo;
      } else {
        const codeInfo = this.toElmCodeInfo(testFrameworkElmModuleName, fi);
        result[fi.filePath] = codeInfo;
      }
    }

    return result;
  }

  public toElmCodeInfo(testFrameworkElmModuleName: string, pathInfo: FileInfo): ElmCodeInfo {
    let moduleNode = this.parser.parse(pathInfo.filePath, testFrameworkElmModuleName);
    const fileName = path.basename(pathInfo.filePath);
    const lastModified = pathInfo.stats.mtime;

    return {fileName, filePath: pathInfo.filePath, isTestFile: true, lastModified, moduleNode};
  }

  public updateTests(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      try {
        let testFrameworkName = context.config.testFramework.testFrameworkElmModuleName();
        const testFiles = this.findFiles(context.testDirectory, ".elm", true);
        context.codeLookup = this.syncElmCodeLookupWithFileChanges(context.codeLookup, testFiles, testFrameworkName);
        resolve(context);
      } catch (err) {
        this.logger.error("Failed to find tests for generation of test suite", err);
        reject();
      }
    });
  }
}

export function createElmCodeLookupManager(): ElmCodeLookupManager {
  return new ElmCodeLookupManagerImp(createElmParser(), createLogger());
}
