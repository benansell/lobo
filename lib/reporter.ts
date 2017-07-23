import * as Bluebird from "bluebird";
import * as program from "commander";
import * as _ from "lodash";
import * as plugin from "./plugin";

interface PartialTestRunSummary {
  config: plugin.TestReportConfig;
  durationMilliseconds: number | undefined;
  endDateTime: Date | undefined;
  failedCount: number;
  failures: plugin.TestRunLeaf<plugin.TestReportFailedLeaf>[];
  onlyCount: number;
  outcome: string | undefined;
  passedCount: number;
  runResults: plugin.TestReportNode[];
  runType: plugin.RunType;
  skipped: plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>[];
  skippedCount: number;
  startDateTime: Date | undefined;
  success: boolean;
  todo: plugin.TestRunLeaf<plugin.TestReportTodoLeaf>[];
  todoCount: number;
}

export interface Reporter {
  configure(plugin: plugin.PluginReporter): void;
  finish(rawResults: plugin.TestReportRoot): Bluebird<void>;
  init(testCount: number): void;
  runArgs(args: plugin.RunArgs): void;
  update(result: plugin.ProgressReport): void;
}

export class ReporterImp implements Reporter {
  private reporterPlugin: plugin.PluginReporter;

  public configure(reporterPlugin: plugin.PluginReporter): void {
    this.reporterPlugin = reporterPlugin;
  }

  public runArgs(args: plugin.RunArgs): void {
    this.reporterPlugin.runArgs(args);
  }

  public init(testCount: number): void {
    this.reporterPlugin.init(testCount);
  }

  public update(result: plugin.ProgressReport): void {
    if (program.quiet) {
      return;
    }

    this.reporterPlugin.update(result);
  }

  public finish(rawResults: plugin.TestReportRoot): Bluebird<void> {
    let results = this.processResults(rawResults);
    let promise = this.reporterPlugin.finish(results);

    return promise.then(() => {
      if (results.summary.success) {
        return;
      } else {
        throw new Error("Failed");
      }
    });
  }

  public processResults(rawResults: plugin.TestReportRoot): plugin.TestRun {
    let summary: PartialTestRunSummary = {
      config: rawResults.config,
      durationMilliseconds: undefined,
      endDateTime: undefined,
      failedCount: 0,
      failures: [],
      onlyCount: 0,
      outcome: undefined,
      passedCount: 0,
      runResults: rawResults.runResults,
      runType: rawResults.runType,
      skipped: [],
      skippedCount: 0,
      startDateTime: undefined,
      success: false,
      todo: [],
      todoCount: 0
    };

    if (rawResults.startTime) {
      summary.startDateTime = new Date(rawResults.startTime);
    }

    if (rawResults.endTime) {
      summary.endDateTime = new Date(rawResults.endTime);
    }

    if (rawResults.startTime && rawResults.endTime) {
      let durationDate = new Date(rawResults.endTime - rawResults.startTime);
      summary.durationMilliseconds = durationDate.getMilliseconds();
    }

    this.processTestResults(rawResults.runResults, summary, []);

    let failState: plugin.TestRunFailState = {
      only: this.toTestRunState(program.failOnOnly, summary.onlyCount > 0 || summary.runType === "FOCUS"),
      skip: this.toTestRunState(program.failOnSkip, summary.skippedCount > 0 || summary.runType === "SKIP"),
      todo: this.toTestRunState(program.failOnTodo, summary.todoCount > 0)
    };

    if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
      summary.success = false;
    } else {
      summary.success = summary.failedCount === 0;
    }

    summary.outcome = this.calculateOutcome(summary, failState);

    return {failState: failState, summary: <plugin.TestRunSummary> summary};
  }

  public processTestResults(results: plugin.TestReportNode[], summary: PartialTestRunSummary, labels: string[]): void {
    if (!results) {
      return;
    }

    _.forEach(results, (r: plugin.TestReportNode) => {
      switch (r.resultType) {
        case "FAILED":
          summary.failedCount += 1;
          summary.failures.push({labels: _.clone(labels), result: <plugin.TestReportFailedLeaf> r});
          break;
        case "IGNORED":
          summary.onlyCount += 1;
          break;
        case "PASSED":
          summary.passedCount += 1;
          break;
        case "SKIPPED":
          summary.skippedCount += 1;
          summary.skipped.push({labels: _.clone(labels), result: <plugin.TestReportSkippedLeaf> r});
          break;
        case "TODO":
          summary.todoCount += 1;
          summary.todo.push({labels: _.clone(labels), result: <plugin.TestReportTodoLeaf> r});
          break;
        default:
          let newLabels = _.clone(labels);
          newLabels.push(r.label);

          this.processTestResults((<plugin.TestReportSuiteNode> r).results, summary, newLabels);
      }
    });
  }

  public toTestRunState(flag: boolean | undefined, exists: boolean): plugin.TestRunState {
    let isFailOn = flag === true;
    let isFailure = isFailOn && exists;

    return {exists: exists, isFailOn: isFailOn, isFailure: isFailure};
  }

  public calculateOutcome(summary: PartialTestRunSummary, failState: plugin.TestRunFailState): string {
    let prefix;

    if (summary.runType !== "NORMAL") {
      prefix = "PARTIAL ";
    } else {
      prefix = summary.onlyCount > 0 ? "FOCUSED " : "";
    }

    if (summary.failedCount > 0) {
      return prefix + "TEST RUN FAILED";
    } else if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
      return prefix + "TEST RUN FAILED";
    } else if (failState.skip.exists || failState.todo.exists) {
      return prefix + "TEST RUN INCONCLUSIVE";
    } else {
      return prefix + "TEST RUN PASSED";
    }
  }
}

export function createReporter(): Reporter {
  return new ReporterImp();
}
