
import * as _ from "lodash";
import * as chalk from "chalk";
import * as program from "commander";
import {Compare, createCompare} from "./compare";
import {
  FailureMessage,
  PluginReporter, ProgressReport, RunArgs, TestReportFailedLeaf, TestReportSkippedLeaf, TestReportTodoLeaf, TestRun,
  TestRunFailState,
  TestRunLeaf,
  TestRunSummary
} from "../../lib/plugin";
import {createUtil, Util} from "../../lib/util";

type LeafItem = TestRunLeaf<TestReportFailedLeaf> | TestRunLeaf<TestReportSkippedLeaf> | TestRunLeaf<TestReportTodoLeaf>;

interface Logger {
  log(message: string): void;
}

export class DefaultReporterImp implements PluginReporter {

  private compare: Compare;
  private logger: Logger;
  private util: Util;
  private passedStyle: chalk.ChalkChain = chalk.green;
  private failedStyle: chalk.ChalkChain = chalk.red;
  private givenStyle: chalk.ChalkChain = chalk.yellow;
  private inconclusiveStyle: chalk.ChalkChain = chalk.yellow;
  private headerStyle: chalk.ChalkChain = chalk.bold;
  private labelStyle: chalk.ChalkChain = chalk.dim;
  private onlyStyle: chalk.ChalkChain;
  private skipStyle: chalk.ChalkChain;
  private todoStyle: chalk.ChalkChain;
  private initArgs: RunArgs;

  public constructor(compare: Compare, logger: Logger, util: Util) {
    this.compare = compare;
    this.logger = logger;
    this.util = util;
  }

  public runArgs(args: RunArgs): void {
    this.initArgs = args;
  }

  public init(): void {
    // ignore testCount
    this.onlyStyle = program.failOnOnly ? this.failedStyle : this.inconclusiveStyle;
    this.skipStyle = program.failOnSkip ? this.failedStyle : this.inconclusiveStyle;
    this.todoStyle = program.failOnTodo ? this.failedStyle : this.inconclusiveStyle;
  }

  public update(result: ProgressReport): void {
    if (!result) {
      process.stdout.write(" ");
    } else if (result.resultType === "PASSED") {
      process.stdout.write(".");
    } else if (result.resultType === "FAILED") {
      process.stdout.write(chalk.red("!"));
    } else if (result.resultType === "SKIPPED") {
      process.stdout.write(this.skipStyle("?"));
    } else if (result.resultType === "TODO") {
      process.stdout.write(this.todoStyle("-"));
    } else {
      process.stdout.write(" ");
    }
  }

  public finish(results: TestRun): void {
    let summary = results.summary;
    let failState = results.failState;

    if (program.quiet) {
      this.paddedLog("");
      this.logSummaryHeader(summary, failState);
      this.paddedLog("");
      return;
    }

    this.paddedLog("");
    this.logSummary(summary, failState);
    this.paddedLog("");
    this.logNonPassed(summary);
    this.paddedLog("");
  }

  public logSummary(summary: TestRunSummary, failState: TestRunFailState): void {
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

  public logSummaryHeader(summary: TestRunSummary, failState: TestRunFailState): void {
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
    if (items.length === 0) {
      return items;
    }

    let failureSortKey = (x: LeafItem) => x.labels.join(" ") + " " + x.result.label;
    let maxItem = <LeafItem> _.maxBy(items, (x: LeafItem) => failureSortKey(x).length);
    let max = failureSortKey(maxItem).length;

    return _.sortBy(items, [(x: LeafItem) => _.padStart(failureSortKey(x), max, " ")]).reverse();
  }

  public logNonPassed(summary: TestRunSummary): void {
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
    let index = 1;

    while (sortedItemList.length > 0) {
      let item = sortedItemList.pop();

      if (!item) {
        continue;
      }

      let isNotRun = false;
      let style = this.failedStyle;

      if (item.result.resultType === "SKIPPED") {
        isNotRun = true;
        style = this.skipStyle;
      } else if (item.result.resultType === "TODO") {
        isNotRun = true;
        style = this.todoStyle;
      }

      context = this.logLabels(item.labels, item.result.label, index, context, style);

      if (isNotRun) {
        this.logNotRunMessage(<TestRunLeaf<TestReportSkippedLeaf>>item, padding);
      } else {
        this.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>>item, padding);
      }
      index++;
    }
  }

  public logLabels(labels: string[], itemLabel: string, index: number, context: string[], itemStyle: chalk.ChalkChain): string[] {
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

  public logFailureMessage(item: TestRunLeaf<TestReportFailedLeaf>, padding: string): void {
    let stdout = <{ columns: number }><{}>process.stdout;

    // default to a width of 80 when process is not running in a terminal
    let maxLength = stdout.columns ? stdout.columns - padding.length : 80;
    let givenStyle = this.givenStyle("Given");

    _.forEach(item.result.resultMessages, (resultMessage: FailureMessage) => {
      if (resultMessage.given && resultMessage.given.length > 0) {
        this.paddedLog("");
        this.paddedLog("  • " + givenStyle);
        this.logger.log(this.formatMessage("  " + resultMessage.given, padding));
      }

      this.paddedLog("");

      let message = this.formatFailure(resultMessage.message, maxLength);
      this.logger.log(this.formatMessage(message, padding));
      this.paddedLog("");
    });
  }

  public logNotRunMessage(item: TestRunLeaf<TestReportSkippedLeaf>, padding: string): void {
    this.paddedLog("");
    this.paddedLog(this.formatMessage(item.result.reason, padding));
    this.paddedLog("");
  }

  public formatFailure(message: string, maxLength: number): string {
    if (message.indexOf("│") === -1) {
      return message.replace(message, "\n  " + chalk.yellow(message) + "\n");
    }

    let lines = message.split("\n");

    // remove diff lines
    let diffRegex = /Expect.equal(Dicts|Lists|Sets)/;

    if (lines.length > 5 && diffRegex.test(lines[2])) {
      lines.splice(5, lines.length - 5);
    }

    if (lines.length !== 5) {
      return message;
    }

    if (lines[2].indexOf("│ ") !== -1) {
      lines[0] = "┌ " + lines[0];
      lines[1] = lines[1].replace("╷", "│");
      lines[3] = lines[3].replace("╵", "│");
      lines[4] = "└ " + lines[4];

      let expectMessage = lines[2].substring(2, lines[2].length);
      lines[2] = lines[2].replace(expectMessage, chalk.yellow(expectMessage));
    }

    let expectEqualRegex = /Expect.equal(Dicts|Lists|Sets)*/;

    if (expectEqualRegex.test(lines[2])) {
      lines = this.formatExpectEqualFailure(lines, maxLength);
    }

    return lines.join("\n");
  }

  public formatExpectEqualFailure(unprocessedLines: string[], maxLength: number): string[] {
    let lines: Array<string | string[]> = _.clone(unprocessedLines);
    lines.push("   ");

    // remove "┌ " and "└ "
    let left = (<string>lines[0]).substring(2);
    let right = (<string>lines[4]).substring(2);
    let value = this.compare.diff(left, right);
    lines[1] = "│ " + value.left;
    lines[5] = "  " + value.right;

    lines[0] = this.chunkLine(<string>lines[0], <string>lines[1], maxLength, "┌ ", "│ ");
    lines[1] = "";

    lines[4] = this.chunkLine(<string>lines[4], <string>lines[5], maxLength, "└ ", "  ");
    lines[5] = "";

    return <string[]> _.flattenDepth(lines, 1);
  }

  public chunkLine(rawContentLine: string, rawDiffLine: string, length: number, firstPrefix: string, prefix: string): string[] {
    let contentLine = rawContentLine.substring(firstPrefix.length - 1);
    let diffLine = rawDiffLine.substring(firstPrefix.length - 1);
    let size = Math.ceil(contentLine.length / length);
    let chunks = new Array(size * 2);
    let offset;
    let sectionLength = length - prefix.length - 1;

    chunks[0] = firstPrefix + contentLine.substring(1, sectionLength + 1);
    chunks[1] = prefix + chalk.red(diffLine.substring(1, sectionLength + 1));

    for (let i = 1; i < size; i++) {
      offset = (i * sectionLength) + 1;
      chunks[i * 2] = prefix + contentLine.substring(offset, offset + sectionLength);
      chunks[i * 2 + 1] = prefix + chalk.red(diffLine.substring(offset, offset + sectionLength));
    }

    return chunks;
  }

  public formatMessage(rawMessage: string, padding: string): string {
    if (!rawMessage) {
      return "";
    }

    return padding + rawMessage.replace(/(\n)+/g, "\n" + padding);
  }

  public paddedLog(message: string): void {
    if (!message) {
      this.logger.log("");
      return;
    }

    this.logger.log("  " + message);
  }
}

export function createPlugin(): PluginReporter {
  return new DefaultReporterImp(createCompare(), console, createUtil());
}
