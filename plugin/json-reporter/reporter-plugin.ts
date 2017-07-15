import * as program from "commander";
import {PluginReporter, ProgressReport, TestRun, TestRunSummary} from "../../lib/plugin";

interface Logger {
  log(message: string): void;
}

export class JsonReporter implements PluginReporter {

  private logger: Logger;

  public static toCommonOutput(summary: TestRunSummary): Object {
    return {
      config: summary.config,
      durationMilliseconds: summary.durationMilliseconds,
      endDateTime: summary.endDateTime,
      failedCount: summary.failedCount,
      onlyCount: summary.onlyCount,
      outcome: summary.outcome,
      passedCount: summary.passedCount,
      runType: summary.runType,
      skippedCount: summary.skippedCount,
      startDateTime: summary.startDateTime,
      success: summary.success,
      todoCount: summary.todoCount
    };
  }

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public logSummary(summary: TestRunSummary): void {
    let output = JsonReporter.toCommonOutput(summary);
    this.logger.log(JSON.stringify(output));
  }

  public logFull(summary: TestRunSummary): void {
    let output: object = JsonReporter.toCommonOutput(summary);
    (<{ runResults: object }>output).runResults = summary.runResults;
    this.logger.log(JSON.stringify(output));
  }

  public runArgs(): void {
    // ignore args
  }

  public init(): void {
    // ignore testCount
  }

  public  update(result: ProgressReport): void {
    this.logger.log(JSON.stringify(result));
  }

  public finish(results: TestRun): void {
    if (program.quiet) {
      this.logSummary(results.summary);
    } else {
      this.logFull(results.summary);
    }
  }
}

export function createPlugin(): PluginReporter {
  return new JsonReporter(console);
}
