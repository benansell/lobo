import * as Bluebird from "bluebird";
import * as _ from "lodash";
import * as Chalk from "chalk";
import * as program from "commander";
import {TestResultFormatter, createTestResultFormatter} from "../../lib/test-result-formatter";
import * as plugin from "../../lib/plugin";
import {createUtil, Util} from "../../lib/util";

type LeafItem = plugin.TestRunLeaf<plugin.TestReportFailedLeaf>
  | plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>
  | plugin.TestRunLeaf<plugin.TestReportTodoLeaf>;


export class DefaultReporterImp implements plugin.PluginReporter {

  private logger: plugin.PluginReporterLogger;
  private testResultFormatter: TestResultFormatter;
  private util: Util;
  private passedStyle: Chalk.ChalkChain = Chalk.green;
  private failedStyle: Chalk.ChalkChain = Chalk.red;
  private inconclusiveStyle: Chalk.ChalkChain = Chalk.yellow;
  private headerStyle: Chalk.ChalkChain = Chalk.bold;
  private labelStyle: Chalk.ChalkChain = Chalk.dim;
  private onlyStyle: Chalk.ChalkChain;
  private skipStyle: Chalk.ChalkChain;
  private todoStyle: Chalk.ChalkChain;
  private initArgs: plugin.RunArgs;

  public static calculateMaxLabelLength(items: LeafItem[]): number {
    let maxLabelLength = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].result.label.length > maxLabelLength) {
        maxLabelLength = items[i].result.label.length;
      }

      for (let j = 0; j < items[i].labels.length; j++) {
        let label = items[i].labels[j];

        if (label.length > maxLabelLength) {
          maxLabelLength = label.length;
        }
      }
    }

    return maxLabelLength;
  }

  public constructor(logger: plugin.PluginReporterLogger, testResultFormatter: TestResultFormatter, util: Util) {
    this.logger = logger;
    this.testResultFormatter = testResultFormatter;
    this.util = util;
  }

  public runArgs(args: plugin.RunArgs): void {
    this.initArgs = args;
  }

  public init(): void {
    // ignore testCount
    this.onlyStyle = program.failOnOnly ? this.failedStyle : this.inconclusiveStyle;
    this.skipStyle = program.failOnSkip ? this.failedStyle : this.inconclusiveStyle;
    this.todoStyle = program.failOnTodo ? this.failedStyle : this.inconclusiveStyle;
  }

  public update(result: plugin.ProgressReport): void {
    if (!result) {
      process.stdout.write(" ");
    } else if (result.resultType === "PASSED") {
      process.stdout.write(".");
    } else if (result.resultType === "FAILED") {
      process.stdout.write(Chalk.red("!"));
    } else if (result.resultType === "SKIPPED") {
      process.stdout.write(this.skipStyle("?"));
    } else if (result.resultType === "TODO") {
      process.stdout.write(this.todoStyle("-"));
    } else {
      process.stdout.write(" ");
    }
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
          this.paddedLog("");
          this.logNonPassed(summary);
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

    this.paddedLog(this.passedStyle("Passed:   " + summary.passedCount));
    this.paddedLog(this.failedStyle("Failed:   " + summary.failedCount));

    if (summary.todoCount > 0) {
      this.paddedLog(this.todoStyle("Todo:     " + summary.todoCount));
    }

    if (program.framework !== "elm-test") {
      // full run details not available when using elm-test

      if (summary.skippedCount > 0) {
        this.paddedLog(this.skipStyle("Skipped:  " + summary.skippedCount));
      }

      if (summary.onlyCount > 0) {
        this.paddedLog(this.onlyStyle("Ignored:  " + summary.onlyCount));
      }
    }

    if (summary.durationMilliseconds) {
      this.paddedLog("Duration: " + summary.durationMilliseconds + "ms");
    }

    this.paddedLog("");
    this.paddedLog(this.headerStyle("TEST RUN ARGUMENTS"));

    _.forOwn(this.initArgs, (value: object, key: string) => this.paddedLog(this.util.padRight(key + ": ", 12) + value));

    this.logger.log("================================================================================");
  }

  public logSummaryHeader(summary: plugin.TestRunSummary, failState: plugin.TestRunFailState): void {
    let outcomeStyle = this.passedStyle;

    if (summary.failedCount > 0) {
      outcomeStyle = this.failedStyle;
    } else if (!failState.only || !failState.skip || !failState.todo) {
      outcomeStyle = this.failedStyle;
    } else if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
      outcomeStyle = this.failedStyle;
    } else if (failState.skip.exists || failState.todo.exists) {
      outcomeStyle = this.inconclusiveStyle;
    }

    this.paddedLog(this.headerStyle(outcomeStyle(summary.outcome)));
  }

  public sortItemsByLabel(items: LeafItem[]): LeafItem[] {
    if (!items || items.length === 0) {
      return [];
    }

    let maxSize = <number> _.max(_.map(items, x => x.labels.length));
    let maxLabelLength = DefaultReporterImp.calculateMaxLabelLength(items);

    return _.sortBy(items, (x: LeafItem) => this.toFailureSortKey(maxSize, maxLabelLength, x));
  }

  public toFailureSortKey(maxSize: number, maxLabelLength: number, item: LeafItem): string {
    let maxSizeLength = maxSize.toString.length;
    let toSortKey = (x: string) => this.util.padRight(x, maxLabelLength);

    let prefix = _.map(item.labels, y => toSortKey(y)).join(" " + this.util.padRight("?", maxSizeLength, "?") + ":");
    let suffix = " " + this.util.padRight(item.labels.length.toString(), maxSizeLength, "?") + ":" + toSortKey(item.result.label);

    return prefix + suffix;
  }

  public logNonPassed(summary: plugin.TestRunSummary): void {
    let itemList: LeafItem[] = _.clone(summary.failures);

    if (program.showSkip) {
      itemList = itemList.concat(summary.skipped);
    }

    if (program.showTodo) {
      itemList = itemList.concat(summary.todo);
    }

    let sortedItemList = this.sortItemsByLabel(itemList);
    let padding = "    ";
    let context: string[] = [];

    for (let i = 0; i < sortedItemList.length; i++) {
      let item = sortedItemList[i];

      let isNotRun = false;
      let style = this.failedStyle;

      if (item.result.resultType === "SKIPPED") {
        isNotRun = true;
        style = this.skipStyle;
      } else if (item.result.resultType === "TODO") {
        isNotRun = true;
        style = this.todoStyle;
      }

      context = this.logLabels(item.labels, item.result.label, i + 1, context, style);

      if (isNotRun) {
        this.logNotRunMessage(<plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>>item, padding);
      } else {
        this.logFailureMessage(<plugin.TestRunLeaf<plugin.TestReportFailedLeaf>>item, padding);
      }
    }
  }

  public logLabels(labels: string[], itemLabel: string, index: number, context: string[], itemStyle: Chalk.ChalkChain): string[] {
    if (labels.length === 0) {
      return context;
    }

    let labelPad = "";
    let i;

    for (i = 0; i < labels.length; i++) {
      if (context[i] !== labels[i]) {
        context = context.slice(0, i);
        break;
      }
    }

    for (let j = 0; j < labels.length; j++) {
      if (context[j] === labels[j]) {
        labelPad += " ";
        continue;
      }

      let label = labels[j];
      this.paddedLog(this.labelStyle(labelPad + label));
      labelPad += " ";
      context.push(label);
    }

    this.paddedLog("    " + index + ") " + itemStyle(itemLabel));

    return context;
  }

  public logFailureMessage(item: plugin.TestRunLeaf<plugin.TestReportFailedLeaf>, padding: string): void {
    let message = this.testResultFormatter.formatFailure(item, padding);
    this.logger.log(message);
  }

  public logNotRunMessage(item: plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>, padding: string): void {
    let message = this.testResultFormatter.formatNotRun(item, padding);
    this.logger.log(message);
  }

  public paddedLog(message: string): void {
    if (!message) {
      this.logger.log("");
      return;
    }

    this.logger.log(this.testResultFormatter.defaultIndentation + message);
  }
}

export function createPlugin(): plugin.PluginReporter {
  return new DefaultReporterImp(console, createTestResultFormatter(), createUtil());
}
