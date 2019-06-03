import {
  ElmCodeInfo,
  ElmCodeLookup,
  ExecutionContext, PluginReporterLogger,
  Reject,
  Resolve
} from "./plugin";
import * as Bluebird from "bluebird";
import {
  AnalysisTestSummary,
  AnalyzedTestFunctionNode,
  createTestSuiteAnalyzer,
  TestSuiteAnalyzer
} from "./test-suite-analyzer";
import * as _ from "lodash";
import {createUtil, Util} from "./util";
import {Chalk} from "chalk";
import chalk from "chalk";
import {makeElmCodeHelper} from "./elm-code-helper";
import * as path from "path";

export type AnalysisIssueType = "Hidden" | "OverExposed";

export interface IssueLocation {
  index: number;
  issue: string;
}

export interface Analyzer {
  analyze(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class AnalyzerImp implements Analyzer {

  private failedStyle: Chalk = chalk.red;
  private headerStyle: Chalk = chalk.bold.red;
  private fixStyle: Chalk = chalk.yellow;
  private labelStyle: Chalk = chalk.dim.gray;
  private logger: PluginReporterLogger;
  private readonly messagePrefixPadding: string;
  private testSuiteAnalyzer: TestSuiteAnalyzer;
  private util: Util;

  constructor(logger: PluginReporterLogger, testSuiteAnalyzer: TestSuiteAnalyzer, util: Util) {
    this.logger = logger;
    this.testSuiteAnalyzer = testSuiteAnalyzer;
    this.util = util;
    this.messagePrefixPadding = "        ";
  }

  public analyze(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      if (context.config.noAnalysis === true) {
        resolve(context);
        return;
      }

      const summary = this.testSuiteAnalyzer.buildSummary(context);
      const issueCount = this.report(context.config.appDirectory, context.codeLookup, summary);

      if (issueCount === 0) {
        resolve(context);
      } else {
        reject(new Error("Analysis Issues Found"));
      }
    });
  }

  public defaultIndentation(): string {
    return "  ";
  }

  public highlightIssues(code: string, issues: IssueLocation[]): void {
    if (issues.length === 0) {
      return;
    }

    const lines = code.split("\n");
    const issueLookup = this.toIssueLookup(issues, lines);

    let index = 0;
    let highlightedCount = 0;
    let canLogOmitted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIssues = issueLookup[i];

      if (lines.length < 7) {
        this.paddedLog(this.messagePrefixPadding + line);
      } else {
        if (lineIssues && lineIssues.length > 0 || i < 2)  {
          this.paddedLog(this.messagePrefixPadding + line);
          canLogOmitted = true;
        } else if (canLogOmitted) {
          if (issueLookup[i + 1]) {
            this.paddedLog(this.messagePrefixPadding + line);
          } else {
            this.paddedLog(this.messagePrefixPadding + this.labelStyle("..."));
            canLogOmitted = false;
          }
        }
      }

      if (lineIssues && lineIssues.length > 0) {
        let highlight = this.messagePrefixPadding;

        for (let j = 0; j < lineIssues.length; j++) {
          const lineIssue = lineIssues[j];
          const lineOffset = lineIssue.index - index;
          highlight +=  _.repeat(" ",  lineOffset - highlight.length + this.messagePrefixPadding.length);
          highlight += this.failedStyle(_.repeat("^", lineIssue.issue.length));
          highlightedCount++;
          canLogOmitted = highlightedCount < issues.length;
        }

        this.paddedLog(highlight);
      }

      index += line.length + 1;
    }
  }

  public logLabels(appDirectory: string, codeInfo: ElmCodeInfo, functionNode: AnalyzedTestFunctionNode, index: number, context: string,
                   itemStyle: (x: string) => string): string {
    if (!functionNode) {
      return context;
    }

    if (context !== functionNode.moduleName) {
      context = functionNode.moduleName;
      this.paddedLog(" " + context);
    }

    this.paddedLog("    " + index + ") " + itemStyle(this.toNameAndStartLocation(appDirectory,  codeInfo.filePath, functionNode)));

    return context;
  }

  public paddedLog(message: string): void {
    if (!message) {
      this.logger.log("");
      return;
    }

    this.logger.log(this.defaultIndentation() + message);
  }

  public report(appDirectory: string, codeLookup: ElmCodeLookup, analysis: AnalysisTestSummary): number {
    const issueCount = this.reportAnalysisSummary(analysis);
    this.reportAnalysisFailure(codeLookup, analysis);
    this.reportAnalysisDetail(appDirectory, codeLookup, analysis);

    return issueCount;
  }

  public reportAnalysisDetail(appDirectory: string, codeLookup: ElmCodeLookup, analysis: AnalysisTestSummary): void {
    this.logger.log("");

    if (analysis.hiddenTestCount > 0) {
      this.logger.log(this.headerStyle("Hidden Tests"));
      const message = this.fixStyle("Please add the following to the modules exposing list:");
      this.paddedLog(message);
      this.logger.log("");
      this.reportAnalysisDetailForIssue(appDirectory, codeLookup, analysis.hiddenTests, "Hidden");
      this.logger.log("");
    }

    if (analysis.overExposedTestCount > 0) {
      this.logger.log(this.headerStyle("Over Exposed Tests"));
      const message = "Please update the modules exposing list or test suites such that each test is exposed once by a single module";
      this.paddedLog(this.fixStyle(message));
      this.logger.log("");
      this.reportAnalysisDetailForIssue(appDirectory, codeLookup, analysis.overExposedTests, "OverExposed");
      this.logger.log("");
    }
  }

  public reportAnalysisDetailForIssue(appDirectory: string, codeLookup: ElmCodeLookup, items: AnalyzedTestFunctionNode[],
                                      issueType: AnalysisIssueType): void {
    const sortedItemList = this.sortItemsByLabel(items);
    let context: string = "";

    for (let i = 0; i < sortedItemList.length; i++) {
      const item = sortedItemList[i];
      const codeInfo = codeLookup[item.codeInfoModuleKey];
      context = this.logLabels(appDirectory, codeInfo, item, i + 1, context, this.failedStyle);

      switch (issueType) {
        case "OverExposed":
          this.reportOverExposedTest(appDirectory, codeLookup, item);
          break;
        default:
          this.logger.log("");
          break;
      }
    }
  }

  public reportAnalysisFailure(codeLookup: ElmCodeLookup, analysis: AnalysisTestSummary): void {
    if (analysis.analysisFailureCount === 0) {
      return;
    }

    for (const n of analysis.analysisFailures) {
      const item = codeLookup[n];
      this.paddedLog(this.failedStyle("Failed to analyze test file: " + item.filePath));
    }
  }

  public reportAnalysisSummary(analysis: AnalysisTestSummary): number {
    const issueCount = analysis.analysisFailureCount + analysis.overExposedTestCount + analysis.hiddenTestCount;

    if (issueCount === 0) {
      return issueCount;
    }

    this.logger.log(this.headerStyle("ANALYSIS FAILED"));

    if (analysis.analysisFailureCount > 0) {
      this.paddedLog(
        this.fixStyle(`Failed to analyze ${analysis.analysisFailureCount} module${analysis.analysisFailureCount === 1 ? "" : "s"}`));
    }

    if (analysis.hiddenTestCount > 0) {
      this.paddedLog(this.failedStyle(`Found ${analysis.hiddenTestCount} hidden test${analysis.hiddenTestCount === 1 ? "" : "s"}`));
    }

    if (analysis.overExposedTestCount > 0) {
      const message = `Found ${analysis.overExposedTestCount} over exposed test${analysis.overExposedTestCount === 1 ? "" : "s"}`;
      this.paddedLog(this.failedStyle(message));
    }

    this.logger.log("");

    return issueCount;
  }

  public reportOverExposedTest(appDirectory: string, codeLookup: ElmCodeLookup, functionNode: AnalyzedTestFunctionNode): void {
    if (!functionNode.isExposedDirectly && functionNode.isExposedIndirectlyBy.length === 0) {
      return;
    }

    const codeInfo = codeLookup[functionNode.codeInfoModuleKey];
    const omitted = this.labelStyle("...");

    if (functionNode.isExposedDirectly) {
      if (!codeInfo || !codeInfo.moduleNode) {
        const message = `${functionNode.moduleName} exposing (${omitted}${this.failedStyle(functionNode.node.name)}${omitted})`;
        this.paddedLog(this.messagePrefixPadding + message);
      } else {
        let nextIndex = 0;
        const codeHelper = makeElmCodeHelper(codeInfo.moduleNode.code);
        const issues: IssueLocation[] = [];

        while (nextIndex < codeHelper.maxIndex) {
          const next = codeHelper.findNextWord(nextIndex, true, codeHelper.delimitersTypeList);

          if (next.word === functionNode.node.name) {
            issues.push({index: nextIndex, issue: functionNode.node.name});
          } else if (next.word === "..") {
            issues.push({index: nextIndex, issue: ".."});
          }

          nextIndex = next.nextIndex;
        }

        this.highlightIssues(codeInfo.moduleNode.code, issues);
      }
    }

    for (const i of functionNode.isExposedIndirectlyBy) {
      const issueCodeInfo = codeLookup[i.codeInfoKey];
      this.paddedLog("       " + this.failedStyle(this.toNameAndStartLocation(appDirectory, issueCodeInfo.filePath, i.functionNode)));
      const issues: IssueLocation[] = [];

      for (const occursIndex of i.occurs) {
        issues.push({index: occursIndex, issue: functionNode.node.name});
      }

      this.highlightIssues(i.functionNode.node.code, issues);
    }

    this.logger.log("");
  }

  public sortItemsByLabel(items: AnalyzedTestFunctionNode[]): AnalyzedTestFunctionNode[] {
    if (!items || items.length === 0) {
      return [];
    }

    const maxPathDepth = _.max(items.map(x => this.toPathDepth(x.moduleName)))!;
    const maxLabelLength = _.max(items.map(x => !x.moduleName ? 0 : x.moduleName.length))!;
    const maxLineNumberLength = _.max(items.map(x => x.node.start.lineNumber.toString().length))!;

    return _.sortBy(items, (x: AnalyzedTestFunctionNode) => this.toSortKey(maxPathDepth, maxLabelLength, maxLineNumberLength, x));
  }

  public toIssueLookup(issues: IssueLocation[], lines: string[]): {[id: number]: IssueLocation[]} {
    let index = 0;
    let lineIndex = 0;
    const lookup: { [id: number]: IssueLocation[] } = {};

    for (const i of _.sortBy(issues, x => x.index)) {
      while (lineIndex < lines.length) {
        const line = lines[lineIndex];

        if (i.index >= index && i.index <= index + line.length) {
          if (lookup[lineIndex] === undefined) {
            lookup[lineIndex] = [];
          }

          lookup[lineIndex].push(i);
          break;
        }

        index += line.length + 1;
        lineIndex++;
      }
    }

    return lookup;
  }

  public toPathDepth(moduleName: string): number {
    if (!moduleName) {
      return 0;
    }

    const matches = moduleName.match(/\./g);

    if (!matches) {
      return 0;
    }

    return matches.length;
  }

  public toSortKey(maxPathDepth: number, maxLabelLength: number, maxLineNumberLength: number, item: AnalyzedTestFunctionNode): string {
    let pathDepth: string;
    let moduleName: string;

    if (!item.moduleName) {
      pathDepth = this.util.padRight("", maxPathDepth);
      moduleName = this.util.padRight("", maxLabelLength);
    } else {
      const depth = this.toPathDepth(item.moduleName);
      pathDepth = this.util.padRight(depth.toString(), maxPathDepth);
      moduleName = this.util.padRight(item.moduleName, maxLabelLength);
    }

    const location = _.padStart(item.node.start.lineNumber.toString(), maxLineNumberLength);

    return pathDepth + moduleName + location;

  }

  public toNameAndStartLocation(appDirectory: string, filePath: string, functionNode: AnalyzedTestFunctionNode): string {
    const relativePath = path.relative(appDirectory, filePath);
    return `${functionNode.node.name} (${relativePath}:${functionNode.node.start.lineNumber}:${functionNode.node.start.columnNumber})`;
  }
}

export function createAnalyzer(): Analyzer {
  return new AnalyzerImp(console, createTestSuiteAnalyzer(), createUtil());
}
