import * as Bluebird from "bluebird";
import {ExecutionContext, LoboConfig, Reject, Resolve} from "./plugin";
import {createLogger, Logger} from "./logger";
import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";
import * as tmp from "tmp";

export interface OutputDirectoryManager {
  sync(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class OutputDirectoryManagerImp implements OutputDirectoryManager {

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public configBuildDirectory(loboDirectory: string, testDirectory: string): void {
    if (!fs.existsSync(loboDirectory)) {
      shelljs.mkdir(loboDirectory);
    }

    const loboDirectoryElmStuff = path.resolve(loboDirectory, "elm-stuff");

    if (!fs.existsSync(loboDirectoryElmStuff)) {
      const testElmStuffDirectory = path.resolve(testDirectory, "elm-stuff");
      shelljs.ln("-s", testElmStuffDirectory, loboDirectoryElmStuff);
    }

    const loboDirectoryElmPackage = path.resolve(loboDirectory, "elm-package.json");

    if (!fs.existsSync(loboDirectoryElmPackage)) {
      const testElmPackage = path.resolve(testDirectory, "elm-package.json");
      shelljs.cp(testElmPackage, loboDirectoryElmPackage);
    }
  }

  public generateBuildOutputFilePath(config: LoboConfig): string {
    const dir = path.resolve(config.loboDirectory);
    let tmpFile = tmp.tmpNameSync({dir, prefix: "lobo-test-", postfix: ".js"});

    return tmpFile;
  }

  public sync(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      try {
        this.configBuildDirectory(context.config.loboDirectory, context.testDirectory);
        context.testSuiteOutputFilePath =  path.resolve(context.config.loboDirectory, "Tests.elm");
        context.buildOutputFilePath = this.generateBuildOutputFilePath(context.config);

        resolve(context);
      } catch (err) {
        this.logger.error("Failed to analyze test files", err);
        reject();
      }
    });
  }
}

export function createOutputDirectoryManager(): OutputDirectoryManager {
  return new OutputDirectoryManagerImp(createLogger());
}
