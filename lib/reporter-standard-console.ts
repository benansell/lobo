import * as Bluebird from "bluebird";
import * as program from "commander";
import * as _ from "lodash";
import * as plugin from "./plugin";
import {createTestResultDecoratorConsole} from "./test-result-decorator-console";
import chalk, {Chalk} from "chalk";
import {createTestResultFormatter, TestResultFormatter} from "./test-result-formatter";
import {createUtil, Util} from "./util";


export interface ReporterStandardConsole {
  finish(results: plugin.TestRun): Bluebird<object>;
  paddedLog(message: string): void;
  runArgs(args: plugin.RunArgs): void;
  update(result: plugin.ProgressReport): void;
}

export class ReporterStandardConsoleImp implements ReporterStandardConsole {

  private headerStyle: Chalk = chalk.bold;
  private initArgs?: plugin.RunArgs;
  private logger: plugin.PluginReporterLogger;
  private decorator: plugin.TestResultDecorator;
  private testResultFormatter: TestResultFormatter;
  private util: Util;

  public constructor(logger: plugin.PluginReporterLogger, decorator: plugin.TestResultDecorator,
                     testResultFormatter: TestResultFormatter, util: Util) {
    this.logger = logger;
    this.decorator = decorator;
    this.testResultFormatter = testResultFormatter;
    this.util = util;
  }

  public finish(results: plugin.TestRun): Bluebird<object> {
    return new Bluebird((resolve: plugin.Resolve, reject: plugin.Reject) => {
      try {
        let summary = results.summary;
        let failState = results.failState;
        this.paddedLog("");

        if (program.quiet) {
          this.logSummaryHeader(summary, failState);
        } else {
          this.logSummary(summary, failState);
        }

        this.paddedLog("");
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  public logSummary(summary: plugin.TestRunSummary, failState: plugin.TestRunFailState): void {
    this.logger.log("");
    this.logger.log("==================================== Summary ===================================");

    this.logSummaryHeader(summary, failState);

    this.paddedLog(this.decorator.passed("Passed:   " + summary.passedCount));
    this.paddedLog(this.decorator.failed("Failed:   " + summary.failedCount));

    if (summary.todoCount > 0) {
      this.paddedLog(this.decorator.todo("Todo:     " + summary.todoCount));
    }

    if (program.framework !== "elm-test") {
      // full run details not available when using elm-test

      if (summary.skippedCount > 0) {
        this.paddedLog(this.decorator.skip("Skipped:  " + summary.skippedCount));
      }

      if (summary.onlyCount > 0) {
        this.paddedLog(this.decorator.only("Ignored:  " + summary.onlyCount));
      }
    }

    if (summary.durationMilliseconds) {
      this.paddedLog("Duration: " + summary.durationMilliseconds + "ms");
    }

    this.paddedLog("");
    this.paddedLog(this.headerStyle("TEST RUN ARGUMENTS"));

    _.forOwn(this.initArgs, (value: number, key: string) => this.paddedLog(this.util.padRight(key + ": ", 12) + value));

    this.logger.log("================================================================================");
  }

  public logSummaryHeader(summary: plugin.TestRunSummary, failState: plugin.TestRunFailState): void {
    let outcomeStyle = this.decorator.passed;

    if (summary.failedCount > 0) {
      outcomeStyle = this.decorator.failed;
    } else if (!failState.only || !failState.skip || !failState.todo) {
      outcomeStyle = this.decorator.failed;
    } else if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
      outcomeStyle = this.decorator.failed;
    } else if (failState.skip.exists || failState.todo.exists) {
      outcomeStyle = this.decorator.inconclusive;
    }

    this.paddedLog(this.headerStyle(outcomeStyle(summary.outcome)));
  }

  public runArgs(args: plugin.RunArgs): void {
    this.initArgs = args;
  }

  public paddedLog(message: string): void {
    if (!message) {
      this.logger.log("");
      return;
    }

    this.logger.log(this.testResultFormatter.defaultIndentation() + message);
  }

  public update(result: plugin.ProgressReport): void {
    let output = this.testResultFormatter.formatUpdate(result);
    process.stdout.write(output);
  }
}

export function createReporterStandardConsole(): ReporterStandardConsole {
  return new ReporterStandardConsoleImp(console, createTestResultDecoratorConsole(), createTestResultFormatter(), createUtil());
}
