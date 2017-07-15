import * as Chalk from "chalk";
import * as program from "commander";
import {ChalkChain} from "chalk";

interface NodeConsoleLogger {
  (message?: {}, ...optionalParams: {}[]): void;
}

export enum LogLevel {
  Debug,
  Error,
  Info,
  Trace,
  Warn
}

export interface Logger {
  debug(message: string, data?: string | object): void;
  error(message: string, data?: string | object): void;
  info(message: string, data?: string | object): void;
  trace(message: string, data?: string | object): void;
  warn(message: string, data?: string | object): void;
}

export class LoggerImp implements Logger {

  public trace(message: string, data?: string | object): void {
    this.log(LogLevel.Trace, message, data);
  }

  public debug(message: string, data?: string | object): void {
    this.log(LogLevel.Debug, message, data);
  }

  public info(message: string, data?: string | object): void {
    this.log(LogLevel.Info, message, data);
  }

  public warn(message: string, data?: string | object): void {
    this.log(LogLevel.Warn, message, data);
  }

  public error(message: string, data?: string | object): void {
    this.log(LogLevel.Error, message, data);
  }

  public log(logLevel: LogLevel, message: string, data?: string | object): void {
    if (!this.showLogMessage(logLevel)) {
      return;
    }

    let logger = this.levelToLogger(logLevel);
    let style = this.levelToStyle(logLevel);

    if (data === undefined || data === null) {
      logger(style(message));
    } else if (data instanceof Error) {
      let error = <Error> data;
      logger(style(message + ": "), style(error.toString()));
    } else {
      logger(style(message + ": "), style(JSON.stringify(data)));
    }
  }

  public showLogMessage(level: LogLevel): boolean {
    switch (level) {
      case LogLevel.Trace:
        return this.isOption("veryVerbose");
      case LogLevel.Debug:
        return this.isOption("veryVerbose") || this.isOption("verbose");
      case LogLevel.Info:
        return this.isOption("veryVerbose") || this.isOption("verbose") ||
          !this.isOption("quiet");
      case LogLevel.Warn:
        return this.isOption("veryVerbose") || this.isOption("verbose") ||
          !this.isOption("quiet");
      case LogLevel.Error:
        return true;
      default:
        throw new Error("Unknown log level: " + level);
    }
  }

  public isOption(name: string): boolean {
    let value = program[name];

    if (!value) {
      return false;
    }

    return value;
  }

  public levelToLogger(level: LogLevel): NodeConsoleLogger {
    switch (level) {
      case LogLevel.Trace:
      case LogLevel.Debug:
        return console.log;
      case LogLevel.Info:
        return console.info;
      case LogLevel.Warn:
        return console.warn;
      case LogLevel.Error:
        return console.error;
      default:
        throw new Error("Unknown log level: " + level);
    }
  }

  public levelToStyle(level: LogLevel): ChalkChain {
    switch (level) {
      case LogLevel.Trace:
        return Chalk.dim.gray;
      case LogLevel.Debug:
        return Chalk.gray;
      case LogLevel.Info:
        return Chalk.reset; // don"t apply any style
      case LogLevel.Warn:
        return Chalk.yellow;
      case LogLevel.Error:
        return Chalk.red;
      default:
        throw new Error("Unknown log level: " + level);
    }
  }
}

export function createLogger(): Logger {
  return new LoggerImp();
}
