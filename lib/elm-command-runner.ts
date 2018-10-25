import {LoboConfig, Reject, Resolve} from "./plugin";
import chalk from "chalk";
import {createLogger, Logger} from "./logger";
import * as path from "path";
import * as childProcess from "child_process";
import {createUtil, Util} from "./util";

export interface ElmCommandRunner {
  init(config: LoboConfig, directory: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void;
  install(config: LoboConfig, packageName: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void;
  make(config: LoboConfig, prompt: boolean, hasDebugUsage: boolean, testSuiteOutputFilePath: string, buildOutputFilePath: string,
       resolve: Resolve<void>, reject: Reject): void;
}

export class ElmCommandRunnerImp implements ElmCommandRunner {

  private readonly logger: Logger;
  private readonly util: Util;

  constructor(logger: Logger, util: Util) {
    this.logger = logger;
    this.util = util;
  }

  public init(config: LoboConfig, directory: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    this.util.logStage("INIT");
    this.runElmCommand(config, prompt, directory, "init", resolve, reject);
  }

  public install(config: LoboConfig, packageName: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    const action = "install " + packageName;
    this.util.logStage("INSTALL " + packageName);
    this.runElmCommand(config, prompt, config.loboDirectory, action, resolve, reject);
  }

  public make(config: LoboConfig, prompt: boolean, hasDebugUsage: boolean, testSuiteOutputFilePath: string, buildOutputFilePath: string,
              resolve: Resolve<void>, reject: Reject): void {
    let action = "make";

    if (config.optimize && !hasDebugUsage) {
      action += " --optimize";
    }

    action += ` ${testSuiteOutputFilePath} --output=${buildOutputFilePath}`;
    this.util.logStage("BUILD");
    this.runElmCommand(config, prompt, config.loboDirectory, action, resolve, reject);
  }

  public runElmCommand(config: LoboConfig, prompt: boolean, directory: string, action: string, resolve: Resolve<void>, reject: Reject)
    : void {
    let command = "elm";

    if (config.compiler) {
      command = path.join(config.compiler, command);
    }

    command += " " + action;
    let options = {cwd: directory};
    this.logger.trace(command);
    const child = childProcess.exec(command, options);
    const awaitingInput = "[Y/n]: ";

    child.stdout.on("data", (data: string) => {
      process.stdout.write(data);

      if (prompt === false && data[data.length - 2] === ":") {
        const ending = data.slice(data.length - awaitingInput.length);

        if (ending === awaitingInput) {
          const response = "y\n";
          child.stdin.write(response);
          process.stdout.write(response);
        }
      }
    });

    child.on("close", (exitCode: number) => {
      if (exitCode === 0) {
        resolve();
      } else {
        this.logger.debug("Failed to run elm command: " + action);
        this.logger.error("");
        this.logger.error(chalk.bold("  BUILD FAILED"));
        this.logger.error("");
        reject(new Error("Build Failed"));
      }
    });
  }
}

export function createElmCommandRunner(): ElmCommandRunner {
  return new ElmCommandRunnerImp(createLogger(), createUtil());
}
