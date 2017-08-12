import * as Bluebird from "bluebird";
import * as program from "commander";
import * as _ from "lodash";
import * as fs from "fs";
import * as os from "os";
import * as plugin from "../../lib/plugin";
import {WriteStream} from "fs";
import {createTestResultDecoratorConsole} from "../../lib/test-result-decorator-console";
import {createTestResultDecoratorJUnit} from "./test-result-decorator-junit";
import {createTestResultFormatter, TestResultFormatter} from "../../lib/test-result-formatter";
import {createReporterStandardConsole, ReporterStandardConsole} from "../../lib/reporter-standard-console";

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

  private consoleFormatter: TestResultFormatter;
  private standardConsole: ReporterStandardConsole;
  private junitFormatter: TestResultFormatter;
  private logger: plugin.PluginReporterLogger;
  private diffMaxLength: number;
  private paddingUnit: string;

  public static getDurationSecondsFrom(node: {startTime?: number, endTime?: number}): number {
    if (!node || !node.startTime || !node.endTime) {
      return 0;
    }

    let durationDate = new Date(node.endTime - node.startTime);

    return durationDate.getSeconds();
  }

  constructor(logger: plugin.PluginReporterLogger, paddingUnit: string, standardConsole: ReporterStandardConsole,
              consoleFormatter: TestResultFormatter, junitFormatter: TestResultFormatter) {
    this.logger = logger;
    this.paddingUnit = paddingUnit;
    this.standardConsole = standardConsole;
    this.consoleFormatter = consoleFormatter;
    this.junitFormatter = junitFormatter;

    this.diffMaxLength = program.diffMaxLength;
  }

  public build(summary: plugin.TestRunSummary): MeasuredNode {
    let root = <plugin.TestReportNode><{}> {
      endTime: summary.endDateTime ? summary.endDateTime.getTime() : undefined,
      failedCount: 0,
      ignoredCount: 0,
      label: "Lobo Tests",
      passedCount: 0,
      resultType: "SUITE",
      results: summary.runResults,
      skippedCount: 0,
      startTime: summary.startDateTime ? summary.startDateTime.getTime() : undefined,
      testCount: 0,
      todoCount: 0
    };

    return this.enrichResult(root);
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
    let measuredNode = <MeasuredNode><{}> node;
    measuredNode.failedCount = 0;
    measuredNode.ignoredCount = 0;
    measuredNode.passedCount = 0;
    measuredNode.skippedCount = 0;
    measuredNode.testCount = 0;
    measuredNode.todoCount = 0;

    _.forEach(node.results, (child: plugin.TestReportNode) => {
      let measuredChild = this.enrichResult(child);
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

  public  update(result: plugin.ProgressReport): void {
    this.standardConsole.update(result);
  }

  public finish(results: plugin.TestRun): Bluebird<object> {
    let steps: Array<() => Bluebird<object>> = [];
    steps.push(() => this.standardConsole.finish(results));

    steps.push(() => {
      let measuredRoot = this.build(results.summary);

      return this.write(program.reportFile, measuredRoot);
    });

    return Bluebird.mapSeries(steps, item => item());
  }

  public writeResult(writeLine: WriteLine, measuredRoot: MeasuredNode): void {
    writeLine(`<?xml version="1.0" encoding="UTF-8"?>`);
    let durationInSeconds = JUnitReporter.getDurationSecondsFrom(<plugin.TestReportSuiteNode><{}>measuredRoot);
    let line = `<testsuites name="${measuredRoot.label}" time="${durationInSeconds}" tests="${measuredRoot.testCount}"`
      + ` failures="${measuredRoot.failedCount}">`;
    writeLine(line);
    let node = <{results: plugin.TestReportNode[]}><{}>measuredRoot;
    this.writeResultList(writeLine, measuredRoot.label, node.results, this.paddingUnit);
    writeLine(`</testsuites>`);
  }

  public writeResultList(writeLine: WriteLine, label: string, results: plugin.TestReportNode[], padding: string): void {
    if (!results) {
      return;
    }

    _.forEach(results, (node: plugin.TestReportNode) => {
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
          let testSuite = <plugin.TestReportSuiteNode> node;
          this.writeTestSuiteStart(writeLine, testSuite, padding);
          let newPadding = padding + this.paddingUnit;
          this.writeResultList(writeLine, testSuite.label, testSuite.results, newPadding);
          this.writeTestSuiteEnd(writeLine, padding);
      }
    });
  }

  public writeFailure(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportFailedLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="${JUnitReporter.getDurationSecondsFrom(leaf)}" `
      + ` classname="${parentLabel}">`);
    let message = this.junitFormatter.formatFailure(leaf, "", this.diffMaxLength);
    writeLine(`${padding}${this.paddingUnit}<failure>`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}<![CDATA[`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}${this.paddingUnit}<pre style="overflow:auto">`);
    writeLine(`<code style="display:inline-block; line-height:1">${message}`);
    writeLine(`</code>`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}${this.paddingUnit}</pre>`);
    writeLine(`${padding}${this.paddingUnit}${this.paddingUnit}]]>`);
    writeLine(`${padding}${this.paddingUnit}</failure>`);
    writeLine(`${padding}</testcase>`);
  }

  public writeIgnored(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportIgnoredLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="0" classname="${parentLabel}">`);
    writeLine(`${padding}${this.paddingUnit}<skipped></skipped>`);
    writeLine(`${padding}</testcase>`);
  }

  public writePassed(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportPassedLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="${JUnitReporter.getDurationSecondsFrom(leaf)}" `
      + `classname="${parentLabel}">`);
    writeLine(`${padding}</testcase>`);
  }

  public writeSkipped(writeLine: WriteLine, parentLabel: string, leaf: plugin.TestReportSkippedLeaf, padding: string): void {
    writeLine(`${padding}<testcase name="${leaf.label}" time="0" classname="${parentLabel}">`);
    writeLine(`${padding}${this.paddingUnit}<skipped message="${leaf.reason}">`);
    writeLine(`${padding}${this.paddingUnit}</skipped>`);
    writeLine(`${padding}</testcase>`);
  }

  public writeTestSuiteStart(writeLine: WriteLine, suite: plugin.TestReportSuiteNode, padding: string): void {
    let measuredNode = <MeasuredNode><{}>suite;
    let timestamp = suite.startTime ? new Date(suite.startTime).toISOString() : null;
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

  public write(reportPath: string, measuredRoot: MeasuredNode): Bluebird<object> {
    return new Bluebird((resolve: plugin.Resolve, reject: plugin.Reject) => {
      try {
        let stream = fs.createWriteStream(reportPath);
        let writeLine = this.createLineWriter(stream);
        this.writeResult(writeLine, measuredRoot);
        stream.end(null, () => {
          this.logger.log("JUnit Report Successfully written to: " + reportPath);
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
  let consoleFormatter = createTestResultFormatter(createTestResultDecoratorConsole());
  let junitFormatter = createTestResultFormatter(createTestResultDecoratorJUnit());

  return new JUnitReporter(console, "  ", createReporterStandardConsole(), consoleFormatter, junitFormatter);
}