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

const expect = chai.expect;
chai.use(SinonChai);

describe("lib analyzer", () => {
  const RewiredAnalyzer = rewire("../../../lib/analyzer");
  let analyzerImp: AnalyzerImp;
  let mockBuildSummary: Sinon.SinonStub;
  let mockLog: Sinon.SinonStub;
  let mockLogger: PluginReporterLogger;
  let mockPadRight: Sinon.SinonStub;
  let mockRelativePath: Sinon.SinonStub;
  let mockTestSuiteAnalyzer: TestSuiteAnalyzer;
  let mockUtil: Util;
  let revert: () => void;

  beforeEach(() => {
    mockRelativePath = Sinon.stub();

    revert = RewiredAnalyzer.__set__({
      path: {relative: mockRelativePath}
    });
    const rewiredImp = RewiredAnalyzer.__get__("AnalyzerImp");

    mockLog = Sinon.stub();
    mockLogger = <PluginReporterLogger> {log: mockLog};
    mockBuildSummary = Sinon.stub();
    mockTestSuiteAnalyzer = <TestSuiteAnalyzer> {buildSummary: mockBuildSummary};
    mockPadRight = Sinon.stub();
    mockUtil = <Util> {};
    mockUtil.padRight = mockPadRight;
    analyzerImp = new rewiredImp(mockLogger, mockTestSuiteAnalyzer, mockUtil);
  });

  afterEach(() => {
    revert();
  });

  describe("createAnalyzer", () => {
    it("should return analyzer", () => {
      // act
      const actual: Analyzer = createAnalyzer();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("analyze", () => {
    it("should return a promise that does not call testSuiteAnalyzer.buildSummary when noAnalysis is true", () => {
      // arrange
      const context = <ExecutionContext> {config: {noAnalysis: true}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(mockTestSuiteAnalyzer.buildSummary).not.to.have.been.called;
      });
    });

    it("should return a promise that calls testSuiteAnalyzer.buildSummary when noAnalysis is false", () => {
      // arrange
      const context = <ExecutionContext> {config: {noAnalysis: false}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(mockTestSuiteAnalyzer.buildSummary).to.have.been.called;
      });
    });

    it("should return a promise that calls testSuiteAnalyzer.buildSummary with the context", () => {
      // arrange
      const context = <ExecutionContext> {config: {}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(mockTestSuiteAnalyzer.buildSummary).to.have.been.calledWith(context);
      });
    });

    it("should return a promise that calls report with the config.appDirectory", () => {
      // arrange
      const expected = <ElmCodeLookup> {};
      const context = <ExecutionContext> {codeLookup: expected, config: {appDirectory: "foo"}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(analyzerImp.report).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls report with the context.codeLookup", () => {
      // arrange
      const expected = <ElmCodeLookup> {};
      const context = <ExecutionContext> {codeLookup: expected, config: {}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(analyzerImp.report).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should return a promise that calls report with the analysis summary", () => {
      // arrange
      const expected = <AnalysisTestSummary> {analysisFailureCount: 123};
      const context = <ExecutionContext> {codeLookup: {}, config: {}};
      mockBuildSummary.returns(expected);
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then(() => {
        expect(analyzerImp.report).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected);
      });
    });

    it("should return a promise that is resolved with the context when there are no issues", () => {
      // arrange
      const context = <ExecutionContext> {codeLookup: {}, config: {}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(0);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result).to.equal(context);
      });
    });

    it("should return a promise that is rejected with an 'Analysis Failed' error when there are issues", () => {
      // arrange
      const context = <ExecutionContext> {codeLookup: {}, config: {}};
      mockBuildSummary.returns({});
      const mockReport = Sinon.stub();
      mockReport.returns(1);
      analyzerImp.report = mockReport;

      // act
      const actual = analyzerImp.analyze(context);

      // assert
      return actual.catch((result: Error) => {
        expect(result instanceof Error).to.be.true;
        expect(result.message).to.equal("Analysis Issues Found");
      });
    });
  });

  describe("defaultIndentation", () => {
    it("should return '  '", () => {
      // act
      const actual = analyzerImp.defaultIndentation();

      // assert
      expect(actual).to.equal("  ");
    });

  });

  describe("highlightIssues", () => {
    it("should not log anything when there are no issues", () => {
      // arrange
      const issues = [];

      // act
      analyzerImp.highlightIssues("foo", issues);

      // assert
      expect(mockLog).not.to.have.been.called;
    });

    it("should call paddedLog for the code with the messagePrefixPadding", () => {
      // arrange
      const issues = [{index: 6, issue: "bar"}];
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo = bar", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("        " + "foo = bar");
    });

    it("should call paddedLog for the highlight with the messagePrefixPadding", () => {
      // arrange
      const issues = [{index: 6, issue: "bar"}];
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo = bar", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith(Sinon.match(/ {14}.*\^\^\^.*/));
    });

    it("should call padded log for the first 2 lines of the code when there are more than 6 lines", () => {
      // arrange
      const issues = [{index: 7, issue: "bar"}];
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("        " + "foo =");
      expect(mockPaddedLog).to.have.been.calledWith("        " + "bar");
    });

    it("should call padded log with 3rd line when the issue is on the 3rd line and there are more than 6 lines", () => {
      // arrange
      const issues = [{index: 12, issue: "baz"}];
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith("        " + "baz");
    });

    it("should call padded log with '...' after first two lines when the issue is not on the 3rd line and there are more than 6 lines",
       () => {
        // arrange
        const issues = [{index: 21, issue: "quux"}];
        const mockPaddedLog = Sinon.stub();
        analyzerImp.paddedLog = mockPaddedLog;

        // act
        analyzerImp.highlightIssues("foo =\nbar\nbaz\nqux\nquux\nquuux\n", issues);

        // assert
        expect(mockPaddedLog).to.have.been.calledWith(Sinon.match(/ {8}.*\.\.\..*/));
      });

    it("\"should not call padded log with '...' when issue is on the 4th line and there are more than 6 lines", () => {
      // arrange
      const issues = [{index: 16, issue: "qux"}];
      const mockPaddedLog = Sinon.stub();
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
      const codeInfo = <ElmCodeInfo> {};
      const style = Sinon.stub();

      // act
      analyzerImp.logLabels("foo", codeInfo, undefined, 123, "abc", style);

      // assert
      expect(mockLog).not.to.have.been.called;
    });

    it("should call padded log with the context when the functionNode.moduleName is not the context", () => {
      // arrange
      const codeInfo = <ElmCodeInfo> {};
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const style = Sinon.stub();
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels("bar", codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockPaddedLog).to.have.been.calledWith(" foo");
    });

    it("should not call padded log with the context when the functionNode.moduleName is the context", () => {
      // arrange
      const codeInfo = <ElmCodeInfo> {};
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const style = Sinon.stub();
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels("bar", codeInfo, functionNode, 123, "foo", style);

      // assert
      expect(mockPaddedLog).not.to.have.been.calledWith(" foo");
    });

    it("should call toNameAndStartLocation with the supplied appDireectory", () => {
      // arrange
      const codeInfo = <ElmCodeInfo> {filePath: "./somewhere"};
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const style = Sinon.stub();
      const mockToNameAndStartLocation = Sinon.stub();
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.logLabels("bar", codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockToNameAndStartLocation).to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call toNameAndStartLocation with the codeInfo.filePath", () => {
      // arrange
      const codeInfo = <ElmCodeInfo> {filePath: "./somewhere"};
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const style = Sinon.stub();
      const mockToNameAndStartLocation = Sinon.stub();
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.logLabels("bar", codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockToNameAndStartLocation).to.have.been.calledWith(Sinon.match.any, "./somewhere", Sinon.match.any);
    });

    it("should call toNameAndStartLocation with the functionNode", () => {
      // arrange
      const codeInfo = <ElmCodeInfo> {};
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const style = Sinon.stub();
      const mockToNameAndStartLocation = Sinon.stub();
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.logLabels("bar", codeInfo, functionNode, 123, "abc", style);

      // assert
      expect(mockToNameAndStartLocation).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, functionNode);
    });

    it("should call padded log with the stylized name and start location", () => {
      // arrange
      const codeInfo = <ElmCodeInfo> {};
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const mockToNameAndStartLocation = Sinon.stub();
      mockToNameAndStartLocation.returns("start");
      analyzerImp.toNameAndStartLocation = mockToNameAndStartLocation;
      const style = Sinon.stub();
      style.withArgs("start").returns("styled");
      const mockPaddedLog = Sinon.stub();
      analyzerImp.paddedLog = mockPaddedLog;

      // act
      analyzerImp.logLabels("bar", codeInfo, functionNode, 123, "abc", style);

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
      const mockDefaultIndentation = Sinon.stub();
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
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisSummary).to.have.been.calledWith(analysis);
    });

    it("should return the issueCount from reportAnalysisSummary", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {};
      const codeLookup = <ElmCodeLookup> {};
      const mockReportSummary = Sinon.stub();
      mockReportSummary.returns(123);
      analyzerImp.reportAnalysisSummary = mockReportSummary;
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      const actual = analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(actual).to.equal(123);
    });

    it("should call reportAnalysisFailure with the codeLookup", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisFailure).to.have.been.calledWith(codeLookup, Sinon.match.any);
    });

    it("should call reportAnalysisFailure with the analysis", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisFailure).to.have.been.calledWith(Sinon.match.any, analysis);
    });

    it("should call reportAnalysisDetail with the supplied appDirectory", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetail).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetail with the codeLookup", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetail).to.have.been.calledWith(Sinon.match.any, codeLookup, Sinon.match.any);
    });

    it("should call reportAnalysisDetail with the analysis", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisSummary = Sinon.stub();
      analyzerImp.reportAnalysisFailure = Sinon.stub();
      analyzerImp.reportAnalysisDetail = Sinon.stub();

      // act
      analyzerImp.report("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetail).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, analysis);
    });
  });

  describe("reportAnalysisDetail", () => {
    it("should log the 'Hidden Tests' detail when hiddenTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(mockLog).to.have.been.calledWith(Sinon.match(/Hidden Tests/));
    });

    it("should log the 'Please add the following to the modules exposing list:' detail when hiddenTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(mockLog).to.have.been.calledWith(Sinon.match(/Please add the following to the modules exposing list:/));
    });

    it("should call reportAnalysisDetailForIssue with the supplied appDirectory when hiddenTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with the codeLookup when hiddenTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been
        .calledWith(Sinon.match.any, codeLookup, Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with the hiddenTests when hiddenTestCount is greater than zero", () => {
      // arrange
      const expected = [<AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar"}}];
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 123, hiddenTests: expected};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with 'Hidden' when hiddenTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "Hidden");
    });

    it("should log the 'Over Exposed Tests' detail when overExposedTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(mockLog).to.have.been.calledWith(Sinon.match(/Over Exposed Tests/));
    });

    it("should log the 'Please add the following to the modules exposing list:' detail when overExposedTestCount is greater than zero",
       () => {
        // arrange
        const analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
        const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

        // act
        analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

        // assert
        const matcher = /Please update the modules exposing list or test suites such that each test is exposed once by a single module/;
        expect(mockLog).to.have.been.calledWith(Sinon.match(matcher));
      });

    it("should call reportAnalysisDetailForIssue with the supplied appDirectory when overExposedTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with the codeLookup when overExposedTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been
        .calledWith(Sinon.match.any, codeLookup, Sinon.match.any, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with the overExposedTests when overExposedTestCount is greater than zero", () => {
      // arrange
      const expected = [<AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar"}}];
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 123, overExposedTests: expected};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call reportAnalysisDetailForIssue with 'OverExposed' when overExposedTestCount is greater than zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 123};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.reportAnalysisDetailForIssue = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetail("foo", codeLookup, analysis);

      // assert
      expect(analyzerImp.reportAnalysisDetailForIssue).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "OverExposed");
    });
  });

  describe("reportAnalysisDetailForIssue", () => {
    it("should call sortItemsByLabel with the supplied items", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      const mockSortItemsByLabel = Sinon.stub();
      mockSortItemsByLabel.returns([]);
      analyzerImp.sortItemsByLabel = mockSortItemsByLabel;

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.sortItemsByLabel).to.have.been.calledWith(items);
    });

    it("should call logLabels with the supplied appDirectory", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.logLabels = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.logLabels).to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call logLabels with the codeInfo for the item", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.logLabels = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.logLabels).to.have.been.calledWith(Sinon.match.any, codeLookup.baz, Sinon.match.any);
    });

    it("should call logLabels with the item", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.logLabels = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "Hidden");

      // assert
      expect(analyzerImp.logLabels).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, items[0]);
    });

    it("should call log with empty string when the issue type is 'Hidden'", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "Hidden");

      // assert
      expect(mockLog).to.have.been.calledWith("");
    });

    it("should call reportOverExposedTest with codeLookup when the supplied appDirectory", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.reportOverExposedTest = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "OverExposed");

      // assert
      expect(analyzerImp.reportOverExposedTest).to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call reportOverExposedTest with codeLookup when the issue type is 'OverExposed'", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.reportOverExposedTest = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "OverExposed");

      // assert
      expect(analyzerImp.reportOverExposedTest).to.have.been.calledWith(Sinon.match.any, codeLookup, Sinon.match.any);
    });

    it("should call reportOverExposedTest with item when the issue type is 'OverExposed'", () => {
      // arrange
      const items = [<AnalyzedTestFunctionNode> {codeInfoModuleKey: "baz", moduleName: "foo", node: {start: {lineNumber: 123}}}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.reportOverExposedTest = Sinon.stub();

      // act
      analyzerImp.reportAnalysisDetailForIssue("bar", codeLookup, items, "OverExposed");

      // assert
      expect(analyzerImp.reportOverExposedTest).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, items[0]);
    });
  });

  describe("reportAnalysisFailure", () => {
    it("should not call paddedLog when the analysisFailureCount is zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 0, analysisFailures: []};
      const codeLookup = <ElmCodeLookup> {};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisFailure(codeLookup, analysis);

      // assert
      expect(analyzerImp.paddedLog).not.to.have.been.called;
    });

    it("should call paddedLog with 'Failed to analyze test file: ' when the analysisFailureCount is not zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 1, analysisFailures: ["foo"]};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisFailure(codeLookup, analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Failed to analyze test file: /));
    });

    it("should call paddedLog with failed module file path when the analysisFailureCount is not zero", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 1, analysisFailures: ["foo"]};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "bar"}};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisFailure(codeLookup, analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/bar/));
    });
  });

  describe("reportAnalysisSummary", () => {
    it("should not log 'ANALYSIS FAILED' when there are no issues", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 0, hiddenTestCount: 0, overExposedTestCount: 0};

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(mockLogger.log).not.to.have.been.calledWith(Sinon.match(/ANALYSIS FAILED/));
    });

    it("should log 'ANALYSIS FAILED' when there are issues", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 1, hiddenTestCount: 0, overExposedTestCount: 0};

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(mockLogger.log).to.have.been.calledWith(Sinon.match(/ANALYSIS FAILED/));
    });

    it("should call paddedLog with the singular total failed analysis message when failure count is 1", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 1};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Failed to analyze 1 module/));
    });

    it("should call paddedLog with the singular total failed analysis message when failure count is not 1", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {analysisFailureCount: 2};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Failed to analyze 2 modules/));
    });

    it("should not call paddedLog with the hiddenTestCount message when hiddenTestCount is 0", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 0};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).not.to.have.been.calledWith(Sinon.match(/hidden test/));
    });

    it("should call paddedLog with the singular hiddenTestCount message when hiddenTestCount is 1", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 1};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 1 hidden test/));
    });

    it("should call paddedLog with the plural total hiddenTestCount message when hiddenTestCount is greater than 1", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {hiddenTestCount: 2};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 2 hidden tests/));
    });

    it("should not call paddedLog with the overExposedTestCount message when overExposedTestCount is 0", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 0};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).not.to.have.been.calledWith(Sinon.match(/hidden test/));
    });

    it("should call paddedLog with the singular overExposedTestCount message when overExposedTestCount is 1", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 1};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportAnalysisSummary(analysis);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/Found 1 over exposed test/));
    });

    it("should call paddedLog with the plural total overExposedTestCount message when overExposedTestCount is greater than 1", () => {
      // arrange
      const analysis = <AnalysisTestSummary> {overExposedTestCount: 2};
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
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", isExposedDirectly: false, isExposedIndirectlyBy: []};
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      analyzerImp.reportOverExposedTest("bar", codeLookup, functionNode);

      // assert
      expect(mockLog).not.to.have.been.called;
    });

    it("should call paddedLog with the module name and node name when directly exposed and the module code info cannot be found", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", moduleName: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      analyzerImp.paddedLog = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("baz", codeLookup, functionNode);

      // assert
      expect(analyzerImp.paddedLog).to.have.been.calledWith(Sinon.match(/foo.*bar/));
    });

    it("should call highlightIssues with the module node code when directly exposed", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "baz"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("qux", codeLookup, functionNode);

      // assert
      expect(analyzerImp.highlightIssues).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should call highlightIssues with the issues from module node code when directly exposed by '..'", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "module Foo exposing (..)"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("baz", codeLookup, functionNode);

      // assert
      const issueMatcher = x => x[0].index === 21 && x[0].issue === "..";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with the issues from module node code when directly exposed", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "module Foo exposing (bar)"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("baz", codeLookup, functionNode);

      // assert
      const issueMatcher = x => x[0].index === 21 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with all the issues from module node code when directly exposed", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = true;
      functionNode.isExposedIndirectlyBy = [];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: "module Foo exposing (bar, bar)"}}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("baz", codeLookup, functionNode);

      // assert
      let issueMatcher = x => x[0].index === 21 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
      issueMatcher = x => x[1].index === 26 && x[1].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with the indirect function code when indirectly exposed", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = false;
      const indirectFunctionNode = <AnalyzedTestFunctionNode> {node: {code: "baz = bar", start: {}}};
      functionNode.isExposedIndirectlyBy = [<IndirectlyExposedInfo> {codeInfoKey: "baz", functionNode: indirectFunctionNode, occurs: [1]}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("baz", codeLookup, functionNode);

      // assert
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(indirectFunctionNode.node.code, Sinon.match.any);
    });

    it("should call highlightIssues with the issues from the indirect function code when indirectly exposed", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = false;
      const indirectFunctionNode = <AnalyzedTestFunctionNode> {node: {code: "baz = bar", start: {}}};
      functionNode.isExposedIndirectlyBy =
        [<IndirectlyExposedInfo> {codeInfoKey: "baz", functionNode: indirectFunctionNode, occurs: [6]}];
      const codeLookup = <ElmCodeLookup> {baz: <ElmCodeInfo> {}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("baz", codeLookup, functionNode);

      // assert
      const issueMatcher = x => x[0].index === 6 && x[0].issue === "bar";
      expect(analyzerImp.highlightIssues).to.have.been.calledWith(Sinon.match.any, Sinon.match(issueMatcher));
    });

    it("should call highlightIssues with all the issues from the indirect function code when indirectly exposed", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {codeInfoModuleKey: "foo", node: {name: "bar"}};
      functionNode.isExposedDirectly = false;
      const indirectFunctionNode = <AnalyzedTestFunctionNode> {node: {code: "baz = [bar, bar]", start: {}}};
      functionNode.isExposedIndirectlyBy =
        [<IndirectlyExposedInfo> {codeInfoKey: "baz", functionNode: indirectFunctionNode, occurs: [7, 12]}];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: {code: ""}}, baz: <ElmCodeInfo> {}};
      analyzerImp.highlightIssues = Sinon.stub();

      // act
      analyzerImp.reportOverExposedTest("qux", codeLookup, functionNode);

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
      const actual = analyzerImp.sortItemsByLabel(undefined);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return sorted item array when module is undefined for an item", () => {
      // arrange
      const items = [
        <AnalyzedTestFunctionNode> {moduleName: "ghi", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "abc", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: undefined, node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      const actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[2]);
      expect(actual[1]).to.equal(items[1]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with module of same number of constters", () => {
      // arrange
      const items = [
        <AnalyzedTestFunctionNode> {moduleName: "ghi", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "abc", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "def", node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      const actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with module of different number of constters", () => {
      // arrange
      const items = [
        <AnalyzedTestFunctionNode> {moduleName: "gh", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "abc", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "d", node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      const actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with module of different path lengths", () => {
      // arrange
      const items = [
        <AnalyzedTestFunctionNode> {moduleName: "Foo.Bar.Baz", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "Foo", node: {start: {lineNumber: 1}}},
        <AnalyzedTestFunctionNode> {moduleName: "Foo.Bar", node: {start: {lineNumber: 1}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      const actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with line number of same number of digits", () => {
      // arrange
      const items = [
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 789}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 123}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 456}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      const actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[1]);
      expect(actual[1]).to.equal(items[2]);
      expect(actual[2]).to.equal(items[0]);
    });

    it("should return sorted item array with line number of different lengths", () => {
      // arrange
      const items = [
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 78}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 123}}},
        <AnalyzedTestFunctionNode> {moduleName: "bar", node: {start: {lineNumber: 4}}}
      ];
      mockUtil.padRight = _.padEnd;

      // act
      const actual = analyzerImp.sortItemsByLabel(items);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.equal(items[2]);
      expect(actual[1]).to.equal(items[0]);
      expect(actual[2]).to.equal(items[1]);
    });
  });

  describe("toIssueLookup", () => {
    it("should convert issue array into object with issues keyed by line number", () => {
      // arrange
      const issues = [{index: 8, issue: "baz"}];
      const lines = ["foo", "bar", "baz", "qux"];

      // act
      const actual = analyzerImp.toIssueLookup(issues, lines);

      // assert
      expect(actual[2]).to.deep.equal([issues[0]]);
    });

    it("should convert issue array into object with sorted issues keyed by line number", () => {
      // arrange
      const issues = [{index: 12, issue: "baz"}, {index: 8, issue: "baz"}];
      const lines = ["foo", "bar", "baz baz", "qux"];

      // act
      const actual = analyzerImp.toIssueLookup(issues, lines);

      // assert
      expect(actual[2]).to.deep.equal([issues[1], issues[0]]);
    });
  });

  describe("toPadDepth", () => {
    it("should return zero when the moduleName is undefined", () => {
      // act
      const actual = analyzerImp.toPathDepth(undefined);

      // assert
      expect(actual).to.equal(0);
    });

    it("should return zero when the moduleName does not contain '.'", () => {
      // act
      const actual = analyzerImp.toPathDepth("foo");

      // assert
      expect(actual).to.equal(0);
    });

    it("should return number of '.' when the moduleName contains '.'", () => {
      // act
      const actual = analyzerImp.toPathDepth("Foo.Bar.Baz");

      // assert
      expect(actual).to.equal(2);
    });
  });

  describe("toSortKey", () => {
    it("should call toPathDepth with moduleName", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const mockToPathDepth = Sinon.stub();
      mockToPathDepth.returns(0);
      analyzerImp.toPathDepth = mockToPathDepth;

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockToPathDepth).to.have.been.calledWith("foo");
    });

    it("should call util.padRight with pathDepth", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};
      const mockToPathDepth = Sinon.stub();
      mockToPathDepth.returns(78);
      analyzerImp.toPathDepth = mockToPathDepth;

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith("78", Sinon.match.any);
    });

    it("should call util.padRight with moduleName", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call util.padRight with maxLabelLength", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith(Sinon.match.any, 12);
    });

    it("should call util.padRight with maxLineNumberLength", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "SomethingElse", start: {lineNumber: 456}}};

      // act
      analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(mockPadRight).to.have.been.calledWith(Sinon.match.any, 34);
    });

    it("should return value prefixed with the padded module name", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {lineNumber: 456}}};
      mockPadRight.returns("baz");

      // act
      const actual = analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(actual).to.match(/^baz/);
    });

    it("should return value suffixed with the padded function node start lineNumber", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {lineNumber: 456}}};
      mockPadRight.withArgs("456").returns("456");
      mockPadRight.returns("baz");

      // act
      const actual = analyzerImp.toSortKey(12, 34, 56, functionNode);

      // assert
      expect(actual).to.match(/456$/);
    });

    it("should return value equal to padded path depth, module name and function node start lineNumber", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo.bar", node: {name: "bar", start: {lineNumber: 456}}};
      mockPadRight.withArgs("1").returns("78");
      mockPadRight.withArgs("456").returns("456");
      mockPadRight.returns("baz");

      // act
      const actual = analyzerImp.toSortKey(12, 34, 3, functionNode);

      // assert
      expect(actual).to.equal("78baz456");
    });
  });

  describe("toNameAndStartLocation", () => {
    it("should return value prefixed by the node name", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      const actual = analyzerImp.toNameAndStartLocation("baz", "qux", functionNode);

      // assert
      expect(actual).to.match(/^bar/);
    });

    it("should return value containing the relative file path", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};
      mockRelativePath.returns("abc");

      // act
      const actual = analyzerImp.toNameAndStartLocation("baz", "qux", functionNode);

      // assert
      expect(actual).to.match(/abc/);
    });

    it("should return value containing the lineNumber", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      const actual = analyzerImp.toNameAndStartLocation("baz", "qux", functionNode);

      // assert
      expect(actual).to.match(/456/);
    });

    it("should return value containing the columnNumber", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};

      // act
      const actual = analyzerImp.toNameAndStartLocation("baz", "qux", functionNode);

      // assert
      expect(actual).to.match(/123/);
    });

    it("should return value in the format 'name (relativeFilePath:lineNumber:columnNumber)'", () => {
      // arrange
      const functionNode = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {name: "bar", start: {columnNumber: 123, lineNumber: 456}}};
      mockRelativePath.returns("abc");

      // act
      const actual = analyzerImp.toNameAndStartLocation("baz", "qux", functionNode);

      // assert
      expect(actual).to.match(/bar \(abc:456:123\)/);
    });
  });
});
