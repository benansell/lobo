import * as Bluebird from "bluebird";
import * as program from "commander";
import * as plugin from "../../lib/plugin";
import * as fs from "fs";

export class JsonReporter implements plugin.PluginReporter {

  private logger: plugin.PluginReporterLogger;

  public static toCommonOutput(summary: plugin.TestRunSummary): Object {
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

  constructor(logger: plugin.PluginReporterLogger) {
    this.logger = logger;
  }

  public runArgs(): void {
    // ignore args
  }

  public init(): void {
    // ignore testCount
  }

  public  update(result: plugin.ProgressReport): void {
    this.logger.log(JSON.stringify(result));
  }

  public finish(results: plugin.TestRun): Bluebird<object> {
    return new Bluebird((resolve: plugin.Resolve, reject: plugin.Reject) => {
      let toFile: boolean = program.reportFile !== undefined && program.reportFile !== null && program.reportFile.length > 0;
      let data = this.toString(results, toFile);

      if (toFile) {
        fs.writeFile(program.reportFile, data, err => {
          if (!err) {
            resolve();
            return;
          }

          reject(err);
        });
      } else {
        this.logger.log(data);
        resolve();
      }
    });
  }

  public toFull(summary: plugin.TestRunSummary): object {
    let output: object = JsonReporter.toCommonOutput(summary);
    (<{ runResults: object }>output).runResults = summary.runResults;

    return output;
  }

  public toSummary(summary: plugin.TestRunSummary): object {
    return JsonReporter.toCommonOutput(summary);
  }

  public toString(results: plugin.TestRun, prettyPrint: boolean): string {
    let output: object;

    if (program.quiet) {
      output = this.toSummary(results.summary);
    } else {
      output = this.toFull(results.summary);
    }

    if (prettyPrint) {
      return JSON.stringify(output, null, 2);
    }

    return JSON.stringify(output);
  }
}

export function createPlugin(): plugin.PluginReporter {
  return new JsonReporter(console);
}
