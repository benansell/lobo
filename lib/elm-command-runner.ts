import {LoboConfig, Reject, Resolve} from "./plugin";
import chalk from "chalk";
import {createLogger, Logger} from "./logger";
import * as path from "path";
import * as childProcess from "child_process";

export interface ElmCommandRunner {
  init(config: LoboConfig, directory: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void;
  install(config: LoboConfig, packageName: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void;
  make(config: LoboConfig, hasDebugUsage: boolean, testSuiteOutputFilePath: string, buildOutputFilePath: string,
       resolve: Resolve<void>, reject: Reject): void;
}

export class ElmCommandRunnerImp implements ElmCommandRunner {

  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public init(config: LoboConfig, directory: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    if (prompt === false) {
      this.logger.warn("Unable to disable user prompts");
    }

    try {
      this.runElmCommand(config, directory, "init");
      resolve();
    } catch (err) {
      this.logger.debug("elm init failed");
      this.logger.debug(err);
      reject(err);
    }
  }

  public install(config: LoboConfig, packageName: string, prompt: boolean, resolve: Resolve<void>, reject: Reject): void {
    if (config.noInstall) {
      this.logger.info(`Ignored running of elm install for '${packageName}' due to configuration`);
      resolve();
      return;
    }

    if (prompt === false) {
      this.logger.warn("Unable to disable user prompts");
    }

    let action = "install ";

    try {
      this.runElmCommand(config, config.loboDirectory, action + packageName);
      resolve();
    } catch (err) {
      this.logger.debug("elm install failed");
      this.logger.debug(err);
      reject(err);
    }
  }

  public make(config: LoboConfig, hasDebugUsage: boolean, testSuiteOutputFilePath: string, buildOutputFilePath: string,
              resolve: Resolve<void>, reject: Reject): void {
    let action = "make";

    if (config.optimize && !hasDebugUsage) {
      action += " --optimize";
    }

    action += ` ${testSuiteOutputFilePath} --output=${buildOutputFilePath}`;

    try {
      this.runElmCommand(config, config.loboDirectory, action);
      resolve();
    } catch (err) {
      this.logger.error("");
      this.logger.error(chalk.bold("  BUILD FAILED"));
      this.logger.error("");
      this.logger.debug(err);
      reject(new Error("Build Failed"));
    }
  }

  public runElmCommand(config: LoboConfig, directory: string, action: string): void {
    let command = "elm";

    if (config.compiler) {
      command = path.join(config.compiler, command);
    }

    command += " " + action;

    // run as child process using current process stdio so that colored output is returned
    let options = {cwd: directory, stdio: [process.stdin, process.stdout, process.stderr]};
    this.logger.trace(command);
    childProcess.execSync(command, options);
  }
}

export function createElmCommandRunner(): ElmCommandRunner {
  return new ElmCommandRunnerImp(createLogger());
}
