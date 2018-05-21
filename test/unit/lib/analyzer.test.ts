"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Analyzer, AnalyzerImp, createAnalyzer} from "../../../lib/analyzer";
import {ElmCodeInfo, ElmCodeLookup, ExecutionContext, PluginReporterLogger} from "../../../lib/plugin";
import {AnalysisTestSummary, AnalyzedTestFunctionNode, IndirectlyExposedInfo, TestSuiteAnalyzer} from "../../../lib/test-suite-analyzer";
import {Util} from "../../../lib/util";
import _ = require("lodash");

let expect = chai.expect;
chai.use(SinonChai);

describe("lib analyzer", () => {
  let RewiredAnalyzer = rewire("../../../lib/analyzer");
  let analyzerImp: AnalyzerImp;
  let mockBuildSummary: Sinon.SinonStub;
  let mockLog: Sinon.SinonStub;
  let mockLogger: PluginReporterLogger;
  let mockPadRight: Sinon.SinonStub;
  let mockTestSuiteAnalyzer: TestSuiteAnalyzer;
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredAnalyzer.__get__("AnalyzerImp");

    mockLog = Sinon.stub();
    mockLogger = <PluginReporterLogger> {log: mockLog};
    mockBuildSummary = Sinon.stub();
    mockTestSuiteAnalyzer = <TestSuiteAnalyzer> {buildSummary: mockBuildSummary};
    mockPadRight = Sinon.stub();
    mockUtil = <Util> {};
    mockUtil.padRight = mockPadRight;
    analyzerImp = new rewiredImp(mockLogger, mockTestSuiteAnalyzer, mockUtil);
  });

  describe("createAnalyzer", () => {
    it("should return analyzer", () => {
      // act
      let actual: Analyzer = createAnalyzer();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("analyze", () => {
    it("should return a promise that calls testSuiteAnalyzer.buildSummary with the context", () => {
      // arrange
      let context = <ExecutionContext> {};
      mockBuildSummary.returns({});
      let mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      let actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(mockTestSuiteAnalyzer.buildSummary).to.have.been.calledWith(context);
      });
    });

    it("should return a promise that calls report with the context.codeLookup", () => {
      // arrange
      let expected = <ElmCodeLookup> {};
      let context = <ExecutionContext> {codeLookup: expected};
      mockBuildSummary.returns({});
      let mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      let actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(analyzerImp.report).to.have.been.calledWith(expected, Sinon.match.any);
      });
    });

    it("should return a promise that calls report with the analysis summary", () => {
      // arrange
      let expected = <AnalysisTestSummary> {testCount: 123};
      let context = <ExecutionContext> {codeLookup: {}};
      mockBuildSummary.returns(expected);
      let mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      let actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(analyzerImp.report).to.have.been.calledWith(Sinon.match.any, expected);
      });
    });

    it("should return a promise that is resolved with the context when there are no issues", () => {
      // arrange
      let context = <ExecutionContext> {codeLookup: {}};
      mockBuildSummary.returns({});
      let mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      let actual = analyzerImp.analyze(context);

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result).to.equal(context);
      });
    });

    it("should return a promise that is rejected with an 'Analysis Failed' error when there are issues", () => {
      // arrange
      let context = <ExecutionContext> {codeLookup: {}};
      mockBuildSummary.returns({});
      let mockReport = Sinon.stub();
      mockReport.returns(1);
      analyzerImp.report = mockReport;

      // act
      let actual = analyzerImp.analyze(context);

      // assert
      return actual.catch((result: Error) => {
        expect(result instanceof Error).to.be.true;
        expect(result.message).to.equal("Analysis Failed");
      });
    });
  });

  describe("defaultIndentation", () => {
    it("should return '  '", () => {
      // act
      let actual = analyzerImp.defaultIndentation();

      // assert
      expect(actual).to.equal("  ");
    });

  });

  describe("highlightIssues", () => {
    it("should not log anything when there are no issues", () => {
      // arrange
      let issues = [];

      // act
      analyzerImp.highlightIssues("foo", issues);

      // assert
      expect(mockLog).not.to.have.been.called;
    });

    it("should call paddedLog for the code with the messagePrefixPadding", () => {
      // arrange
      let issues = [{index: 6, issue: "bar"}];
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo = bar", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("        " + "foo = bar");
    });

    it("should call paddedLog for the highlight with the messagePrefixPadding", () => {
      // arrange
      let issues = [{index: 6, issue: "bar"}];
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo = bar", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith(Sinon.match(/ {14}.*\^\^\^.*/));
    });

    it("should call padded log for the first 2 lines of the code when there are more than 6 lines", () => {
      // arrange
      let issues = [{index: 7, issue: "bar"}];
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("        " + "foo =");
      expect(mockPaddedLog).to.have.been.calledWith("        " + "bar");
    });

    it("should call padded log with 3rd line when the issue is on the 3rd line and there are more than 6 lines", () => {
      // arrange
      let issues = [{index: 12, issue: "baz"}];
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("        " + "baz");
    });

    it("should call padded log with '...' after first two lines when the issue is not on the 3rd line and there are more than 6 lines",
       () => {
        // arrange
        let issues = [{index: 21, issue: "quux"}];
        let mockPaddedLog = Sinon.stub();
        analyzerImp.paddedLog = mockPaddedLog;

        // act
        analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

        // assert
        expect(mockPaddedLog).to.have.been.calledWith(Sinon.match(/ {8}.*\.\.\..*/));
      });

    it("\"should not call padded log with '...' when issue is on the 4th line and there are more than 6 lines", () => {
      // arrange
      let issues = [{index: 16, issue: "qux"}];
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

      // assert
      expect(mockPaddedLog).not.to.have.been.calledWith("        " + "...");
    });
  });

  describe("logLabels", () => {
    it("should not log anything when the functionNode is undefined", () => {
      // arrange
      let codeInfo = <ElmCodeInfo> {};
      let style = Sinon.stub();

      // act
      analyzerImp.logLabels(codeInfo, undefined, 123, "abc", style);

      // assert
      expect(mockLog).not.to.have.been.called;
    });

    it("should call padded log with the context when the functionNode.moduleName is not the context", () => {
      // arrange
      let codeInfo = <ElmCodeInfo> {};
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      let style = Sinon.stub();
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels(codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith(" foo");
    });

    it("should call toNameAndStartLocation with the codeInfo.filePath", () => {
      // arrange
      let codeInfo = <ElmCodeInfo> {filePath: "./somewhere"};
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      let style = Sinon.stub();
      let mockToNameAndStartLocation = Sinon.stub();
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels(codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockToNameAndStartLocation).to.have.been.calledWith("./somewhere", Sinon.match.any);
    });

    it("should call toNameAndStartLocation with the functionNode", () => {
      // arrange
      let codeInfo = <ElmCodeInfo> {};
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      let style = Sinon.stub();
      let mockToNameAndStartLocation = Sinon.stub();
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels(codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockToNameAndStartLocation).to.have.been.calledWith(Sinon.match.any, functionNode);
    });

    it("should call padded log with the stylized name and start location", () => {
      // arrange
      let codeInfo = <ElmCodeInfo> {};
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      let mockToNameAndStartLocation = Sinon.stub();
      mockToNameAndStartLocation.returns("start");
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      let style = Sinon.stub();
      style.withArgs("start").returns("styled");
      let mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels(codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("    123) styled");
    });
  });

  describe("paddedLog", () => {
    it("should log empty string when the message is undefined", () => {
      // act
      analyzerImp.paddedLog(undefined);

      // assert
      expect(mockLog).to.have.been.calledWith("");
    });

    it("should log the message with the default padding", () => {
      // arrange
      let mockDefaultIndentation = Sinon.stub();
      mockDefaultIndentation.returns("foo");
      analyzerImp.defaultIndentation = mockDefaultIndentation;

      // act
      analyzerImp.paddedLog("bar");

      // assert
      expect(mockLog).to.have.been.calledWith("foobar");
    });
  });

  describe("report", () => {
    it("should call reportAnalysisSummary with the analysis", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisSummary).to.have.been.calledWith(analysis);
    });

    it("should return the issueCount from reportAnalysisSummary", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {};
      let codeLookup = <ElmCodeLookup> {};
      let mockReportSummary = Sinon.stub();
      mockReportSummary.returns(123);
      analyzerImp.reportAnalysisSummary = mockReportSummary;
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      let actual = analyzerImp.report(codeLookup, analysis);

      // assert
      expect(actual).to.equal(123);
    });

    it("should call reportAnalysisFailure with the codeLookup", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisFailure).to.have.been.calledWith(codeLookup, Sinon.match.any);
    });

    it("should call reportAnalysisFailure with the analysis", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisFailure).to.have.been.calledWith(Sinon.match.any, analysis);
    });

    it("should call reportAnalysisDetail with the codeLookup", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetail).to.have.been.calledWith(codeLookup, Sinon.match.any);
    });

    it("should call reportAnalysisDetail with the analysis", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetail).to.have.been.calledWith(Sinon.match.any, analysis);
    });
  });

  describe("reportAnalysisDetail", () => {
    it("should log the 'HIDDEN TESTS' detail when hiddenTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(mockLog).to.have.been.calledWith(Sinon.match(/HIDDEN TESTS/));
    });

    it("should log the 'Please add the following to the modules exposing list:' detail when hiddenTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(mockLog).to.have.been.calledWith(Sinon.match(/Please add the following to the modules exposing list:/));
    });

    it("should call reportAnalysisDetailForIssue with the codeLookup when hiddenTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(codeLookup, Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with the hiddenTests when hiddenTestCount is greater than zero", () => {
      // arrange
      let expected = [<AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar"}}];
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 123, hiddenTests: expected};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with 'Hidden' when hiddenTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "Hidden");
    });

    it("should log the 'OVER EXPOSED TESTS' detail when overExposedTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(mockLog).to.have.been.calledWith(Sinon.match(/OVER EXPOSED TESTS/));
    });

    it("should log the 'Please add the following to the modules exposing list:' detail when overExposedTestCount is greater than zero",
       () => {
        // arrange
        let analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
        let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

        // act
        analyzerImp.reportAnalysisDetail(codeLookup, analysis);

        // assert
        const matcher = /Please update the modules exposing list or test suites such that each test is exposed by a single route/;
        expect(mockLog).to.have.been.calledWith(Sinon.match(matcher));
      });

    it("should call reportAnalysisDetailForIssue with the codeLookup when overExposedTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(codeLookup, Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with the overExposedTests when overExposedTestCount is greater than zero", () => {
      // arrange
      let expected = [<AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar"}}];
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 123, overExposedTests: expected};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with 'OverExposed' when overExposedTestCount is greater than zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail(codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "OverExposed");
    });
  });

  describe("reportAnalysisDetailForIssue", () => {
    it("should call sortItemsByLabel with the supplied items", () => {
      // arrange
      let items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      let codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      let mockSortItemsByLabel = Sinon.stub();
      mockSortItemsByLabel.returns([]);
      analyzerImp.sortItemsByLabel = mockSortItemsByLabel;

      // act
      analyzerImp.reportAnalysisDetailForIssue(codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.sortItemsByLabel).to.have.been.calledWith(items);
    });

    it("should call logLabels with the codeInfo for the item", () => {
      // arrange
      let items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      let codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.logLabels = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue(codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.logLabels).to.have.been.calledWith(codeLookup.baz, Sinon.match.any);
    });

    it("should call logLabels with the item", () => {
      // arrange
      let items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      let codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.logLabels = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue(codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.logLabels).to.have.been.calledWith(Sinon.match.any, items[0]);
    });

    it("should call log with empty string when the issue type is 'Hidden'", () => {
      // arrange
      let items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      let codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetailForIssue(codeLookup, items, "Hidden");

      // assert
      expect(mockLog).to.have.been.calledWith("");
    });

    it("should call reportOverExposedTest with codeLookup when the issue type is 'OverExposed'", () => {
      // arrange
      let items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      let codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.reportOverExposedTest = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue(codeLookup, items, "OverExposed");

      // assert
      expect(analyzerImp.reportOverExposedTest).to.have.been.calledWith(codeLookup, Sinon.match.any);
    });

    it("should call reportOverExposedTest with item when the issue type is 'OverExposed'", () => {
      // arrange
      let items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      let codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.reportOverExposedTest = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue(codeLookup, items, "OverExposed");

      // assert
      expect(analyzerImp.reportOverExposedTest).to.have.been.calledWith(Sinon.match.any, items[0]);
    });
  });

  describe("reportAnalysisFailure", () => {
    it("should not call paddedLog when the analysisFailureCount is zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {analysisFailureCount: 0, analysisFailures: []};
      let codeLookup = <ElmCodeLookup> {};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisFailure(codeLookup, analysis);

      // assert
      expect(analyzerImp.paddedLog).not.to.have.been.called;
    });

    it("should call paddedLog with 'Failed to analyze test file: ' when the analysisFailureCount is not zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {analysisFailureCount: 1, analysisFailures: ["foo"]};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisFailure(codeLookup, analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Failed to analyze test file: /));
    });

    it("should call paddedLog with failed module file path when the analysisFailureCount is not zero", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {analysisFailureCount: 1, analysisFailures: ["foo"]};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "bar"}};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisFailure(codeLookup, analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/bar/));
    });
  });

  describe("reportAnalysisSummary", () => {
    it("should call paddedLog with the singular total testCount message when testCount is 1", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 1};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 1 test/));
    });

    it("should call paddedLog with the plural total testCount message when testCount is not 1", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {testCount: 0};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 0 tests/));
    });

    it("should not call paddedLog with the hiddenTestCount message when hiddenTestCount is 0", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 0};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).not.to.have.been.calledWith(Sinon.match(/hidden test/));
    });

    it("should call paddedLog with the singular hiddenTestCount message when hiddenTestCount is 1", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 1};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 1 hidden test/));
    });

    it("should call paddedLog with the plural total hiddenTestCount message when hiddenTestCount is greater than 1", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {hiddenTestCount: 2};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 2 hidden tests/));
    });

    it("should not call paddedLog with the overExposedTestCount message when overExposedTestCount is 0", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 0};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).not.to.have.been.calledWith(Sinon.match(/hidden test/));
    });

    it("should call paddedLog with the singular overExposedTestCount message when overExposedTestCount is 1", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 1};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 1 over exposed test/));
    });

    it("should call paddedLog with the plural total overExposedTestCount message when overExposedTestCount is greater than 1", () => {
      // arrange
      let analysis = <AnalysisTestSummary> {overExposedTestCount: 2};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 2 over exposed tests/));
    });
  });

  describe("reportOverExposedTest", () => {
    it("should not log anything if the node is not directly or indirectly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", isExposedDirectly: false, isExposedIndirectlyBy: []};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      expect(mockLog).not.to.have.been.called;
    });

    it("should call paddedLog with the module name and node name when directly exposed and the module code info cannot be found", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", moduleName: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/foo.*bar/));
    });

    it("should call highlightIssues with the module node code when directly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "baz"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      expect(analyzerImp.highlightIssues).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should call highlightIssues with the issues from module node code when directly exposed by '..'", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "module Foo exposing (..)"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      const issueMatcher = x => x[0].index === 21 && x[0].issue === "..";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with the issues from module node code when directly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "module Foo exposing (bar)"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      const issueMatcher = x => x[0].index === 21 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with all the issues from module node code when directly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "module Foo exposing (bar, bar)"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      let issueMatcher = x => x[0].index === 21 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
      issueMatcher = x => x[1].index === 26 && x[1].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with the indirect function code when indirectly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = false;
      let indirectFunctionNode = <AnalyzedTestFunctionNode> {node: {code: "baz = bar"}};
      functionNode.isExposedIndirectlyBy = [<IndirectlyExposedInfo> {codeInfoKey: "baz", functionNode: indirectFunctionNode, occurs: 1}];
      let codeLookup = <ElmCodeLookup> {};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(indirectFunctionNode.node.code, Sinon.match.any);
    });

    it("should call highlightIssues with the issues from the indirect function code when indirectly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = false;
      let indirectFunctionNode = <AnalyzedTestFunctionNode> {node: {code: "baz = bar"}};
      functionNode.isExposedIndirectlyBy = [<IndirectlyExposedInfo> {codeInfoKey: "baz", functionNode: indirectFunctionNode, occurs: 1}];
      let codeLookup = <ElmCodeLookup> {};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      let issueMatcher = x => x[0].index === 6 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with all the issues from the indirect function code when indirectly exposed", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = false;
      let indirectFunctionNode = <AnalyzedTestFunctionNode> {node: {code: "baz = [bar, bar]"}};
      functionNode.isExposedIndirectlyBy = [<IndirectlyExposedInfo> {codeInfoKey: "baz", functionNode: indirectFunctionNode, occurs: 1}];
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: ""}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest(codeLookup, functionNode);

      // assert
      let issueMatcher = x => x[0].index === 7 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
      issueMatcher = x => x[1].index === 12 && x[1].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });
  });

  describe("sortItemsByLabel", () => {
    it("should return empty array when the item list is undefined", () => {
      // act
      let actual = analyzerImp.sortItemsByLabel(undefined);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return sorted item array when module is undefined for an item", () => {
      // arrange
      let items = [
        <AnalyzedTestFunctionNode> {moduleName: "ghi", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "abc", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: undefined, node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      let actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[2]);
      expect(actual[1]).to.equal(items[1]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with module of same number of letters", () => {
      // arrange
      let items = [
        <AnalyzedTestFunctionNode> {moduleName: "ghi", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "abc", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "def", node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      let actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with module of different number of letters", () => {
      // arrange
      let items = [
        <AnalyzedTestFunctionNode> {moduleName: "gh", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "abc", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "d", node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      let actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with module of different path lengths", () => {
      // arrange
      let items = [
        <AnalyzedTestFunctionNode> {moduleName: "Foo.Bar.Baz", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "Foo", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "Foo.Bar", node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      let actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with line number of same number of digits", () => {
      // arrange
      let items = [
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 789}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 123}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 456}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      let actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with line number of different lengths", () => {
      // arrange
      let items = [
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 78}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 123}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 4}}}
      ];

      // act
      let actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[2]);
      expect(actual[1]).to.equal(items[1]);
      expect(actual[2]).to.equal(items[0]);
    });
  });

  describe("toIssueLookup", () => {
    it("should convert issue array into object with issues keyed by line number", () => {
      // arrange
      let issues = [{index: 8, issue: "baz"}];
      let lines = ["foo", "bar", "baz", "qux"];

      // act
      let actual = analyzerImp.toIssueLookup(issues, lines);

      // assert
      expect(actual[2]).to.deep.equal([issues[0]]);
    });

    it("should convert issue array into object with sorted issues keyed by line number", () => {
      // arrange
      let issues = [{index: 12, issue: "baz"}, {index: 8, issue: "baz"}];
      let lines = ["foo", "bar", "baz baz", "qux"];

      // act
      let actual = analyzerImp.toIssueLookup(issues, lines);

      // assert
      expect(actual[2]).to.deep.equal([issues[1], issues[0]]);
    });
  });

  describe("toPadDepth", () => {
    it("should return zero when the moduleName is undefined", () => {
      // act
      let actual = analyzerImp.toPathDepth(undefined);

      // assert
      expect(actual).to.equal(0);
    });

    it("should return zero when the moduleName does not contain '.'", () => {
      // act
      let actual = analyzerImp.toPathDepth("foo");

      // assert
      expect(actual).to.equal(0);
    });

    it("should return number of '.' when the moduleName contains '.'", () => {
      // act
      let actual = analyzerImp.toPathDepth("Foo.Bar.Baz");

      // assert
      expect(actual).to.equal(2);
    });
  });

  describe("toSortKey", () => {
    it("should call toPathDepth with moduleName", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      let mockToPathDepth = Sinon.stub();
      mockToPathDepth.returns(0);
      analyzerImp.toPathDepth = mockToPathDepth;

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockToPathDepth).to.have.been.calledWith("foo");
    });

    it("should call util.padRight with pathDepth", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      let mockToPathDepth = Sinon.stub();
      mockToPathDepth.returns(78);
      analyzerImp.toPathDepth = mockToPathDepth;

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith("78", Sinon.match.any);
    });

    it("should call util.padRight with moduleName", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call util.padRight with maxLabelLength", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith(Sinon.match.any, 12);
    });

    it("should call util.padRight with maxLineNumberLength", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith(Sinon.match.any, 34);
    });

    it("should return value prefixed with the padded module name", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {lineNumber: 456}}};
      mockPadRight.returns("baz");

      // act
      let actual = analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(actual).to.match(/^baz/);
    });

    it("should return value suffixed with the padded function node start lineNumber", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {lineNumber: 456}}};
      mockPadRight.withArgs("456").returns("456");
      mockPadRight.returns("baz");

      // act
      let actual = analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(actual).to.match(/456$/);
    });

    it("should return value equal to padded path depth, module name and function node start lineNumber", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo.bar", node: {name: "bar", start: {lineNumber: 456}}};
      mockPadRight.withArgs("1").returns("78");
      mockPadRight.withArgs("456").returns("456");
      mockPadRight.returns("baz");

      // act
      let actual = analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(actual).to.equal("78baz456");
    });
  });

  describe("toNameAndStartLocation", () => {
    it("should return value prefixed by the node name", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      let actual = analyzerImp.toNameAndStartLocation("baz", functionNode);

      // assert
      expect(actual).to.match(/^bar/);
    });

    it("should return value containing the file path", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      let actual = analyzerImp.toNameAndStartLocation("baz", functionNode);

      // assert
      expect(actual).to.match(/baz/);
    });

    it("should return value containing the lineNumber", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      let actual = analyzerImp.toNameAndStartLocation("baz", functionNode);

      // assert
      expect(actual).to.match(/456/);
    });

    it("should return value containing the columnNumber", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      let actual = analyzerImp.toNameAndStartLocation("baz", functionNode);

      // assert
      expect(actual).to.match(/123/);
    });

    it("should return value in the format 'name (filePath:lineNumber:columnNumber)'", () => {
      // arrange
      let functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      let actual = analyzerImp.toNameAndStartLocation("baz", functionNode);

      // assert
      expect(actual).to.match(/bar \(baz:456:123\)/);
    });
  });
});
