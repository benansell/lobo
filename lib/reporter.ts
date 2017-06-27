import * as program from "commander";
import * as _ from "lodash";
import {
  PluginReporter, ProgressReport, RunType, TestReportConfig, TestReportFailedLeaf, TestReportNode, TestReportRoot,
  TestReportSkippedLeaf, TestReportSuiteNode, TestReportTodoLeaf, TestRun,
  TestRunFailState, TestRunLeaf, TestRunState,
  TestRunSummary, RunArgs
} from "./plugin";

interface PartialTestRunSummary {
  config: TestReportConfig;
  durationMilliseconds: number | undefined;
  endDateTime: Date | undefined;
  failedCount: number;
  failures: TestRunLeaf<TestReportFailedLeaf>[];
  onlyCount: number;
  outcome: string | undefined;
  passedCount: number;
  runResults: TestReportNode[];
  runType: RunType;
  skipped: TestRunLeaf<TestReportSkippedLeaf>[];
  skippedCount: number;
  startDateTime: Date | undefined;
  success: boolean;
  todo: TestRunLeaf<TestReportTodoLeaf>[];
  todoCount: number;
}

export interface Reporter {
  configure(plugin: PluginReporter): void;
  finish(rawResults: TestReportRoot): boolean;
  init(testCount: number): void;
  runArgs(args: RunArgs): void;
  update(result: ProgressReport): void;
}

export class ReporterImp implements Reporter {
  private reporterPlugin: PluginReporter;

  public configure(plugin: PluginReporter): void {
    this.reporterPlugin = plugin;
  }

  public runArgs(args: RunArgs): void {
    this.reporterPlugin.runArgs(args);
  }

  public init(testCount: number): void {
    this.reporterPlugin.init(testCount);
  }

  public update(result: ProgressReport): void {
    if (program.quiet) {
      return;
    }

    this.reporterPlugin.update(result);
  }

  public finish(rawResults: TestReportRoot): boolean {
    let results = this.processResults(rawResults);
    this.reporterPlugin.finish(results);

    return results.summary.success;
  }

  public processResults(rawResults: TestReportRoot): TestRun {
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

    let failState: TestRunFailState = {
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

    return {failState: failState, summary: <TestRunSummary> summary};
  }

  public processTestResults(results: TestReportNode[], summary: PartialTestRunSummary, labels: string[]): void {
    if (!results) {
      return;
    }

    _.forEach(results, (r: TestReportNode) => {
      switch (r.resultType) {
        case "FAILED":
          summary.failedCount += 1;
          summary.failures.push({labels: _.clone(labels), result: <TestReportFailedLeaf> r});
          break;
        case "IGNORED":
          summary.onlyCount += 1;
          break;
        case "PASSED":
          summary.passedCount += 1;
          break;
        case "SKIPPED":
          summary.skippedCount += 1;
          summary.skipped.push({labels: _.clone(labels), result: <TestReportSkippedLeaf> r});
          break;
        case "TODO":
          summary.todoCount += 1;
          summary.todo.push({labels: _.clone(labels), result: <TestReportTodoLeaf> r});
          break;
        default:
          let newLabels = _.clone(labels);
          newLabels.push(r.label);

          this.processTestResults((<TestReportSuiteNode> r).results, summary, newLabels);
      }
    });
  }

  public toTestRunState(flag: boolean | undefined, exists: boolean): TestRunState {
    let isFailOn = flag === true;
    let isFailure = isFailOn && exists;

    return {exists: exists, isFailOn: isFailOn, isFailure: isFailure};
  }

  public calculateOutcome(summary: PartialTestRunSummary, failState: TestRunFailState): string {
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
