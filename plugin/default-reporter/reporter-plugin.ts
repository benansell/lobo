import * as Bluebird from "bluebird";
import * as _ from "lodash";
import chalk, {Chalk} from "chalk";
import * as program from "commander";
import {TestResultFormatter, createTestResultFormatter} from "../../lib/test-result-formatter";
import * as plugin from "../../lib/plugin";
import {createUtil, Util} from "../../lib/util";
import {createTestResultDecoratorConsole} from "../../lib/test-result-decorator-console";
import {createReporterStandardConsole, ReporterStandardConsole} from "../../lib/reporter-standard-console";

type LeafItem = plugin.TestRunLeaf<plugin.TestReportFailedLeaf>
  | plugin.TestRunLeaf<plugin.TestReportPassedLeaf>
  | plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>
  | plugin.TestRunLeaf<plugin.TestReportTodoLeaf>;


export class DefaultReporterImp implements plugin.PluginReporter {

  private logger: plugin.PluginReporterLogger;
  private standardConsole: ReporterStandardConsole;
  private decorator: plugin.TestResultDecorator;
  private testResultFormatter: TestResultFormatter;
  private util: Util;
  private labelStyle: Chalk = chalk.dim;
  private readonly messagePrefixPadding: string;
  private readonly diffMaxLength: number;

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

  public constructor(logger: plugin.PluginReporterLogger, standardConsole: ReporterStandardConsole, decorator: plugin.TestResultDecorator,
                     testResultFormatter: TestResultFormatter, util: Util) {
    this.logger = logger;
    this.standardConsole = standardConsole;
    this.decorator = decorator;
    this.testResultFormatter = testResultFormatter;
    this.util = util;

    this.messagePrefixPadding = "    ";

    // default to a width of 80 when process is not running in a terminal
    let stdout = <{ columns: number }><{}>process.stdout;
    this.diffMaxLength = stdout && stdout.columns ? stdout.columns - this.messagePrefixPadding.length : 80;
  }

  public runArgs(args: plugin.RunArgs): void {
    this.standardConsole.runArgs(args);
  }

  public init(): void {
    // ignore testCount
  }

  public update(result: plugin.ProgressReport): void {
    this.standardConsole.update(result);
  }

  public finish(results: plugin.TestRun): Bluebird<void> {
    let steps: Array<() => Bluebird<void>> = [];
    steps.push(() => this.standardConsole.finish(results));

    steps.push(() => new Bluebird<void>((resolve: plugin.Resolve<void>, reject: plugin.Reject) => {
      try {
        if (!program.quiet) {
          this.logResults(results.summary);
          this.standardConsole.paddedLog("");
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    }));

    return Bluebird.mapSeries(steps, (item: () => Bluebird<void>) => item())
      .return();
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

  public logResults(summary: plugin.TestRunSummary): void {
    let itemList: LeafItem[] = _.clone(summary.failures);

    if (!program.hideDebugMessages) {
      let passedWithLogs = _.filter(summary.successes, x => x.result.logMessages.length > 0);
      itemList = itemList.concat(passedWithLogs);
    }

    if (program.showSkip) {
      itemList = itemList.concat(summary.skipped);
    }

    if (program.showTodo) {
      itemList = itemList.concat(summary.todo);
    }

    let sortedItemList = this.sortItemsByLabel(itemList);
    let context: string[] = [];

    for (let i = 0; i < sortedItemList.length; i++) {
      let item = sortedItemList[i];
      let style: (value: string) => string;

      switch (item.result.resultType) {
        case "PASSED":
          style = this.decorator.passed;
          break;
        case "SKIPPED":
          style = this.decorator.skip;
          break;
        case "TODO":
          style = this.decorator.todo;
          break;
        default: // "FAILED", "IGNORED"
          style = this.decorator.failed;
      }

      context = this.logLabels(item.labels, item.result.label, i + 1, context, style);

      switch (item.result.resultType) {
        case "PASSED":
          this.logPassedMessage(<plugin.TestRunLeaf<plugin.TestReportPassedLeaf>>item);
          break;
        case "SKIPPED":
        case "TODO":
          this.logNotRunMessage(<plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>>item);
          break;
        default: // "FAILED", "IGNORED"
          this.logFailureMessage(<plugin.TestRunLeaf<plugin.TestReportFailedLeaf>>item);
      }
    }
  }

  public logLabels(labels: string[], itemLabel: string, index: number, context: string[], itemStyle: (x: string) => string): string[] {
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
      this.standardConsole.paddedLog(this.labelStyle(labelPad + label));
      labelPad += " ";
      context.push(label);
    }

    this.standardConsole.paddedLog("    " + index + ") " + itemStyle(itemLabel));

    return context;
  }

  public logFailureMessage(item: plugin.TestRunLeaf<plugin.TestReportFailedLeaf>): void {
    let message = this.testResultFormatter.formatFailure(item.result, this.messagePrefixPadding, this.diffMaxLength);
    this.logger.log(message);

    if (!program.hideDebugMessages) {
      let debugMessage = this.testResultFormatter.formatDebugLogMessages(item.result, this.messagePrefixPadding);
      this.logger.log(debugMessage);
    }
  }

  public logNotRunMessage(item: plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>): void {
    let message = this.testResultFormatter.formatNotRun(item.result, this.messagePrefixPadding);
    this.logger.log(message);
  }

  public logPassedMessage(item: plugin.TestRunLeaf<plugin.TestReportPassedLeaf>): void {
    if (!program.hideDebugMessages) {
      this.logger.log("");
      let debugMessage = this.testResultFormatter.formatDebugLogMessages(item.result, this.messagePrefixPadding);
      this.logger.log(debugMessage);
    }
  }
}

export function createPlugin(): plugin.PluginReporter {
  return new DefaultReporterImp(console, createReporterStandardConsole(), createTestResultDecoratorConsole(),
                                createTestResultFormatter(), createUtil());
}
