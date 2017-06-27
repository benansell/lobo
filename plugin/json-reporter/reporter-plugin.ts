import * as program from "commander";
import {PluginReporter, ProgressReport, TestRun, TestRunSummary} from "../../lib/plugin";

class JsonReporter implements PluginReporter {

  public static logSummary(summary: TestRunSummary): void {
    let output = JsonReporter.toCommonOutput(summary);
    console.log(JSON.stringify(output));
  }

  public static logFull(summary: TestRunSummary): void {
    let output: object = JsonReporter.toCommonOutput(summary);
    (<{ runResults: object }>output).runResults = summary.runResults;
    console.log(JSON.stringify(output));
  }

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

  public runArgs(): void {
    // ignore args
  }

  public init(): void {
    // ignore testCount
  }

  public  update(result: ProgressReport): void {
    console.log(JSON.stringify(result));
  }

  public finish(results: TestRun): void {
    if (program.quiet) {
      JsonReporter.logSummary(results.summary);
    } else {
      JsonReporter.logFull(results.summary);
    }
  }
}

export function createPlugin(): PluginReporter {
  return new JsonReporter();
}
