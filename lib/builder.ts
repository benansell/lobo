import * as Bluebird from "bluebird";
import chalk from "chalk";
import * as path from "path";
import * as childProcess from "child_process";
import {createLogger, Logger} from "./logger";
import {ExecutionContext, LoboConfig, Reject, Resolve} from "./plugin";

export interface Builder {
  build(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class BuilderImp implements Builder {

  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public build(context: ExecutionContext): Bluebird<ExecutionContext> {
    return this.make(context.config, context.buildOutputFilePath, context.testDirectory, context.testFile)
      .then(() => context);
  }

  public make(config: LoboConfig, buildOutputFilePath: string, testDirectory: string, testFile: string): Bluebird<void> {
    return new Bluebird((resolve: Resolve<void>, reject: Reject) => {
      let pluginDirectory = path.resolve(__dirname, "..", "plugin");
      let testStuffMainElm = path.join(pluginDirectory, config.testFramework.config.name, config.testMainElm);
      let command = "elm-make";

      if (config.compiler) {
        command = path.join(config.compiler, command);
      }

      if (testFile !== "Tests.elm") {
        command += " " + testFile;
      }

      command += ` ${testStuffMainElm} --output=${buildOutputFilePath}`;

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
  return new BuilderImp(createLogger());
}
