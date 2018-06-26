import * as Bluebird from "bluebird";
import chalk from "chalk";
import {createLogger, Logger} from "./logger";
import {ExecutionContext, LoboConfig, Reject, Resolve} from "./plugin";
import {createUtil, Util} from "./util";

export interface Builder {
  build(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class BuilderImp implements Builder {

  private readonly logger: Logger;
  private readonly util: Util;

  constructor(logger: Logger, util: Util) {
    this.logger = logger;
    this.util = util;
  }

  public build(context: ExecutionContext): Bluebird<ExecutionContext> {
    return this.make(context.config, context.testSuiteOutputFilePath, context.buildOutputFilePath)
      .then(() => context);
  }

  public make(config: LoboConfig, testSuiteOutputFilePath: string, buildOutputFilePath: string)
    : Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      let action = "make";

      if (config.optimize) {
        action += " --optimize";
      }

      action += ` ${testSuiteOutputFilePath} --output=${buildOutputFilePath}`;

      try {
        this.util.runElmCommand(config, config.loboDirectory, action);
        resolve();
      } catch (err) {
        this.logger.error("");
        this.logger.error(chalk.bold("  BUILD FAILED"));
        this.logger.error("");
        this.logger.debug(err);
        reject(new Error("Build Failed"));
      }
    });
  }
}

export function createBuilder(): Builder {
  return new BuilderImp(createLogger(), createUtil());
}
