import * as Bluebird from "bluebird";
import {ExecutionContext, Reject, Resolve} from "./plugin";
import {createLogger, Logger} from "./logger";
import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";

export interface OutputDirectoryManager {
  cleanup(context: ExecutionContext): Bluebird<ExecutionContext>;
  ensureBuildDirectory(context: ExecutionContext): Bluebird<ExecutionContext>
}

export class OutputDirectoryManagerImp implements OutputDirectoryManager {

  private readonly logger: Logger;

  constructor(logger: Logger) {
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

  public ensureBuildDirectory(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      try {
        if (!fs.existsSync(context.config.loboDirectory)) {
          shelljs.mkdir(context.config.loboDirectory);
        }

        resolve(context);
      } catch (err) {
        const message = "Failed to configure lobo temp directory. " +
          `Please try deleting the lobo directory (${context.config.loboDirectory}) and re-run lobo`;
        this.logger.error(message, err);
        reject();
      }
    });
  }
}

export function createOutputDirectoryManager(): OutputDirectoryManager {
  return new OutputDirectoryManagerImp(createLogger());
}
