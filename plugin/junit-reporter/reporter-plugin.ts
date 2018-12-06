import * as Bluebird from "bluebird";
import * as program from "commander";
import * as _ from "lodash";
import * as fs from "fs";
import * as os from "os";
import * as plugin from "../../lib/plugin";
import {WriteStream} from "fs";
import {createTestResultDecoratorHtml} from "../../lib/test-result-decorator-html";
import {createTestResultDecoratorText} from "../../lib/test-result-decorator-text";
import {createTestResultFormatter, TestResultFormatter} from "../../lib/test-result-formatter";
import {createReporterStandardConsole, ReporterStandardConsole} from "../../lib/reporter-standard-console";
import {TestReportLogged} from "../../lib/plugin";

type JUnitFormat = "console" | "html";

export interface MeasuredNode extends plugin.TestReportNode {
  failedCount: number;
  ignoredCount: number;
  passedCount: number;
  skippedCount: number;
  testCount: number;
  todoCount: number;
}

type WriteLine  = (line: string) => void;

export class JUnitReporter implements plugin.PluginReporter {

  private htmlFormatter: TestResultFormatter;
  private textFormatter: TestResultFormatter;
  private standardConsole: ReporterStandardConsole;
  private logger: plugin.PluginReporterLogger;
  private readonly diffMaxLength: number;
  private readonly junitFormat: JUnitFormat;
  private readonly paddingUnit: string;

  public static getDurationSecondsFrom(node: {startTime?: number, endTime?: number}): number {
    if (!node || !node.startTime || !node.endTime) {
      return 0;
    }

    const durationDate = new Date(node.endTime - node.startTime);

    return durationDate.getSeconds();
  }

  constructor(logger: plugin.PluginReporterLogger, paddingUnit: string, standardConsole: ReporterStandardConsole,
              htmlFormatter: TestResultFormatter, textFormatter: TestResultFormatter) {
    this.logger = logger;
    this.paddingUnit = paddingUnit;
    this.standardConsole = standardConsole;
    this.htmlFormatter = htmlFormatter;
    this.textFormatter = textFormatter;

    this.diffMaxLength = program.diffMaxLength;
    this.junitFormat = program.junitFormat;
  }

  public build(summary: plugin.TestRunSummary): MeasuredNode[] {
    return summary.runResults.map((n) => this.enrichResult(n));
  }

  public enrichResult(node: plugin.TestReportNode): MeasuredNode {
    let measuredNode = <MeasuredNode> node;
    measuredNode.failedCount = 0;
    measuredNode.ignoredCount = 0;
    measuredNode.passedCount = 0;
    measuredNode.skippedCount = 0;
    measuredNode.testCount = 0;
    measuredNode.todoCount = 0;

    switch (node.resultType) {
      case "FAILED":
        measuredNode.failedCount = 1;
        measuredNode.testCount = 1;
        break;
      case "IGNORED":
        measuredNode.ignoredCount = 1;
        measuredNode.testCount = 1;
        break;
      case "PASSED":
        measuredNode.passedCount = 1;
        measuredNode.testCount = 1;
        break;
      case "SKIPPED":
        measuredNode.skippedCount = 1;
        measuredNode.testCount = 1;
        break;
      case "TODO":
        measuredNode.todoCount = 1;
        measuredNode.testCount = 1;
        break;
      default:
        measuredNode = this.enrichResultChildren(<plugin.TestReportSuiteNode>node);
    }

    return measuredNode;
  }

  public enrichResultChildren(node: plugin.TestReportSuiteNode): MeasuredNode {
    const measuredNode = <MeasuredNode><{}> node;
    measuredNode.failedCount = 0;
    measuredNode.ignoredCount = 0;
    measuredNode.passedCount = 0;
    measuredNode.skippedCount = 0;
    measuredNode.testCount = 0;
    measuredNode.todoCount = 0;

    _.forEach(node.results, (child: plugin.TestReportNode) => {
      const measuredChild = this.enrichResult(child);
      measuredNode.failedCount += measuredChild.failedCount;
      measuredNode.ignoredCount += measuredChild.ignoredCount;
      measuredNode.passedCount += measuredChild.passedCount;
      measuredNode.skippedCount += measuredChild.skippedCount;
      measuredNode.testCount += measuredChild.testCount;
      measuredNode.todoCount += measuredChild.todoCount;
    });

    return measuredNode;
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
    const steps: Array<() => Bluebird<void>> = [];
    steps.push(() => this.standardConsole.finish(results));

    steps.push(() => {
      const measuredRoots = this.build(results.summary);

      return this.write(program.reportFile, measuredRoots);
    });

    return Bluebird.mapSeries(steps, (item: () => Bluebird<void>) => item())
      .return();
  }

  public writeResult(writeLine: WriteLine, measuredRoot: MeasuredNode): void {
    writeLine(`<?xml version="1.0" encoding="UTF-8"?>`);
    const line = `<testsuites name="${measuredRoot.label}">`;
    writeLine(line);
    const node = <plugin.TestReportSuiteNode><{}> measuredRoot;

    if (!node.results || node.results.length === 0) {
      this.writeResultList(writeLine, measuredRoot.label, [node], this.paddingUnit);
    } else {
      this.writeResultList(writeLine, measuredRoot.label, node.results, this.paddingUnit);
    }

    writeLine(`</testsuites>`);
  }

  public writeResultList(writeLine: WriteLine, label: string, results: plugin.TestReportNode[], padding: string): void {
    _.forEach(results, (node: plugin.TestReportNode) => {
      const testSuite = <plugin.TestReportSuiteNode> node;

      if (!testSuite.results && this.paddingUnit === padding) {
        const suite = <plugin.TestReportSuiteNode><{}> {
          endTime: testSuite.endTime,
          failedCount: 1,
          id: node.id,
          label: node.label,
          results: [node],
          startTime: testSuite.startTime,
          testCount: 1
        };

        this.writeResultList(writeLine, testSuite.label, [suite], padding);
      } else {
        switch (node.resultType) {
          case "FAILED":
            this.writeFailure(writeLine, label, <plugin.TestReportFailedLeaf> node, padding);
            break;
          case "IGNORED":
            this.writeIgnored(writeLine, label, <plugin.TestReportIgnoredLeaf> node, padding);
            break;
          case "PASSED":
            this.writePassed(writeLine, label, <plugin.TestReportPassedLeaf> node, padding);
            break;
          case "SKIPPED":
            this.writeSkipped(writeLine, label, <plugin.TestReportSkippedLeaf> node, padding);
            break;
          case "TODO":
            this.writeTodo(writeLine, label, <plugin.TestReportTodoLeaf> node, padding);
            break;
          default:
            this.writeTestSuiteStart(writeLine, testSuite, padding);
            const newPadding = padding + this.paddingUnit;
            this.writeResultList(writeLine, testSuite.label, testSuite.results, newPadding);
            this.writeTestSuiteEnd(writeLine, padding);
        }
      }
    });
  }

  public writeFailure(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportFailedLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="${JUnitReporter.getDurationSecondsFrom(leaf)}" `
      + ` classname="${parentLabel}">`);

    writeLine(`${padding}${this.paddingUnit}<failure>`);
    const failureMessage = this.toFailureLogMessage(leaf);
    this.writeMessage(writeLine, failureMessage, padding);
    writeLine(`${padding}${this.paddingUnit}</failure>`);
    this.writeDebugLogMessage(writeLine, leaf, padding);
    writeLine(`${padding}</testcase>`);
  }

  public writeMessage(writeLine: WriteLine, message: string, padding: string): void {
    if (this.junitFormat === "html") {
      this.writeAsHtml(writeLine, message, padding);
    } else {
      this.writeAsText(writeLine, message);
    }
  }

  public writeDebugLogMessage(writeLine: WriteLine, leaf: TestReportLogged, padding: string): void {
    if (!leaf.logMessages || leaf.logMessages.length === 0) {
      return;
    }

    writeLine(`${padding}${this.paddingUnit}<system-out>`);
    const debugLogMessages = this.toDebugLogMessage(leaf);
    this.writeMessage(writeLine, debugLogMessages, padding);
    writeLine(`${padding}${this.paddingUnit}</system-out>`);
  }

  public toDebugLogMessage(leaf: plugin.TestReportLogged): string {
    if (this.junitFormat === "html") {
      return this.htmlFormatter.formatDebugLogMessages(leaf, "");
    }

    return this.textFormatter.formatDebugLogMessages(leaf, "");
  }

  public toFailureLogMessage(leaf: plugin.TestReportFailedLeaf): string {
    if (this.junitFormat === "html") {
      return this.htmlFormatter.formatFailure(<plugin.TestReportFailedLeaf> leaf, "", this.diffMaxLength);
    }

    return this.textFormatter.formatFailure(<plugin.TestReportFailedLeaf> leaf, "", this.diffMaxLength);
  }

  public writeAsText(writeLine: WriteLine, message: string): void {
    writeLine(message);
  }

  public writeAsHtml(writeLine: WriteLine, message: string, padding: string): void {
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}<![CDATA[`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}${this.paddingUnit}<pre style="overflow:auto">`);
    writeLine(`<code style="display:inline-block; line-height:1">${message}`);
    writeLine(`</code>`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}${this.paddingUnit}</pre>`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}]]>`);
  }

  public writeIgnored(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportIgnoredLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="0" classname="${parentLabel}">`);
    writeLine(`${padding}${this.paddingUnit}<skipped></skipped>`);
    writeLine(`${padding}</testcase>`);
  }

  public writePassed(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportPassedLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="${JUnitReporter.getDurationSecondsFrom(leaf)}" `
      + `classname="${parentLabel}">`);
    this.writeDebugLogMessage(writeLine, leaf, padding);
    writeLine(`${padding}</testcase>`);
  }

  public writeSkipped(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportSkippedLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="0" classname="${parentLabel}">`);
    writeLine(`${padding}${this.paddingUnit}<skipped message="${leaf.reason}">`);
    writeLine(`${padding}${this.paddingUnit}</skipped>`);
    writeLine(`${padding}</testcase>`);
  }

  public writeTestSuiteStart(writeLine: WriteLine, suite: plugin.TestReportSuiteNode, padding: string): void {
    const measuredNode = <MeasuredNode><{}>suite;
    const timestamp = suite.startTime ? new Date(suite.startTime).toISOString() : null;
    writeLine(`${padding}<testsuite name="${suite.label}" timestamp="${timestamp}" `
      + `tests="${measuredNode.testCount}" failures="${measuredNode.failedCount}" `
      + `time="${JUnitReporter.getDurationSecondsFrom(suite)}">`);
  }

  public writeTestSuiteEnd(writeLine: WriteLine, padding: string): void {
    writeLine(`${padding}</testsuite>`);
  }

  public writeTodo(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportTodoLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="0" classname="${parentLabel}">`);
    writeLine(`${padding}${this.paddingUnit}<skipped></skipped>`);
    writeLine(`${padding}</testcase>`);
  }

  public write(reportPath: string, measuredRoots: MeasuredNode[]): Bluebird<void> {
    return new Bluebird<void>((resolve: plugin.Resolve<void>, reject: plugin.Reject) => {
      try {
        const stream = fs.createWriteStream(reportPath);
        const writeLine = this.createLineWriter(stream);
        measuredRoots.forEach((mn: MeasuredNode) => this.writeResult(writeLine, mn));
        stream.end(null, () => {
          this.logger.log("JUnit report successfully written to: " + reportPath);
          this.logger.log("");
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public createLineWriter(stream: WriteStream): WriteLine {
    return (line: string) => stream.write(line + os.EOL);
  }
}

export function createPlugin(): plugin.PluginReporter {
  const htmlFormatter = createTestResultFormatter(createTestResultDecoratorHtml());
  const textFormatter = createTestResultFormatter(createTestResultDecoratorText());

  return new JUnitReporter(console, "  ", createReporterStandardConsole(), htmlFormatter, textFormatter);
}
