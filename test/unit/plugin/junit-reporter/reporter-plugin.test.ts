"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createPlugin, JUnitReporter, MeasuredNode} from "../../../../plugin/junit-reporter/reporter-plugin";
import {
  PluginReporter, ProgressReport, RunArgs, TestReportFailedLeaf, TestReportIgnoredLeaf, TestReportLogged, TestReportNode,
  TestReportPassedLeaf,
  TestReportSkippedLeaf,
  TestReportSuiteNode, TestReportTodoLeaf,
  TestRun,
  TestRunSummary
} from "../../../../lib/plugin";
import {SinonStub} from "sinon";
import {WriteStream} from "fs";
import {TestResultFormatter} from "../../../../lib/test-result-formatter";
import {ReporterStandardConsole} from "../../../../lib/reporter-standard-console";

const expect = chai.expect;
chai.use(SinonChai);

describe("plugin junit-reporter reporter-plugin", () => {
  const RewiredPlugin = rewire("../../../../plugin/junit-reporter/reporter-plugin");
  let reporter: JUnitReporter;
  let mockLogger: { log(message: string): void };
  let mockStandardConsole: ReporterStandardConsole;
  let mockHtmlFormatter: TestResultFormatter;
  let mockTextFormatter: TestResultFormatter;
  let mockCreateWriteStream: SinonStub;
  let mockWriteLine: SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockCreateWriteStream = Sinon.stub();
    revert = RewiredPlugin.__set__({fs: {createWriteStream: mockCreateWriteStream}});
    const rewiredImp = RewiredPlugin.__get__("JUnitReporter");
    mockLogger = {log: Sinon.spy()};
    mockStandardConsole = <ReporterStandardConsole> {
      finish: Sinon.stub(),
      paddedLog: Sinon.stub(),
      runArgs: Sinon.stub(),
      update: Sinon.stub()
    };
    mockHtmlFormatter = <TestResultFormatter><{}>{formatDebugLogMessages: Sinon.stub(), formatFailure: Sinon.stub()};
    mockTextFormatter = <TestResultFormatter><{}>{formatDebugLogMessages: Sinon.stub(), formatFailure: Sinon.stub()};
    mockWriteLine = Sinon.stub();
    reporter = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
  });

  afterEach(() => {
    revert();
  });

  describe("createPlugin", () => {
    it("should return reporter", () => {
      // act
      const actual: PluginReporter = createPlugin();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("constructor", () => {
    it("should set diffMaxLength to program.diffMaxLength", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {diffMaxLength: 123}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      revertProgram(() => {
        const actual = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        actual.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");
      });

      // assert
      expect(mockTextFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, 123);
    });
  });

  describe("runArgs", () => {
    it("should call reporter standard console with supplied initArgs", () => {
      // arrange
      const expected = <RunArgs> {runCount: 123};

      // act
      reporter.runArgs(expected);

      // assert
      expect(mockStandardConsole.runArgs).to.have.been.calledWith(expected);
    });
  });

  describe("init", () => {
    it("should do nothing", () => {
      // act
      expect(reporter.init()).not.to.throw;
    });
  });

  describe("update", () => {
    it("should call reporter standard console with supplied result", () => {
      // arrange
      const result = <ProgressReport>{resultType: "PASSED"};

      // act
      reporter.update(result);

      // assert
      expect(mockStandardConsole.update).to.have.been.calledWith(result);
    });
  });

  describe("getDurationSecondsFrom", () => {
    it("should return zero when the node is undefined", () => {
      // act
      const actual = JUnitReporter.getDurationSecondsFrom(undefined);

      // assert
      expect(actual).to.equal(0);
    });

    it("should return zero when the node startTime is undefined", () => {
      // act
      const actual = JUnitReporter.getDurationSecondsFrom({startTime: undefined, endTime: 456});

      // assert
      expect(actual).to.equal(0);
    });

    it("should return zero when the node endTime is undefined", () => {
      // act
      const actual = JUnitReporter.getDurationSecondsFrom({startTime: 123, endTime: undefined});

      // assert
      expect(actual).to.equal(0);
    });

    it("should return zero when the number of seconds between the node endTime and startTime", () => {
      // act
      const actual = JUnitReporter.getDurationSecondsFrom({startTime: 1000, endTime: 3000});

      // assert
      expect(actual).to.equal(2);
    });
  });

  describe("build", () => {
    it("should return MeasuredNodes returned by enrichResult", () => {
      // arrange
      const expected = {testCount: 123};
      reporter.enrichResult = Sinon.stub().returns(expected);

      // act
      const actual = reporter.build(<TestRunSummary><{}>{runResults: [{}]});

      // assert
      expect(actual).to.deep.equal([expected]);
    });

    it("should call enrichResult with the supplied summary.runResults", () => {
      // arrange
      const expected = <MeasuredNode> {testCount: 123};
      reporter.enrichResult = Sinon.spy();

      // act
      reporter.build(<TestRunSummary><{}>{runResults: [expected]});

      // assert
      expect(reporter.enrichResult).to.have.been.calledWith(expected);
    });
  });

  describe("enrichResult", () => {
    it("should return a node with failedCount of 1 when supplied resultType is 'FAILED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "FAILED"});

      // assert
      expect(actual.failedCount).to.equal(1);
    });

    it("should return a node with testCount of 1 when supplied resultType is 'FAILED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "FAILED"});

      // assert
      expect(actual.testCount).to.equal(1);
    });

    it("should return a node with ignoredCount of 1 when supplied resultType is 'IGNORED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "IGNORED"});

      // assert
      expect(actual.ignoredCount).to.equal(1);
    });

    it("should return a node with testCount of 1 when supplied resultType is 'IGNORED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "IGNORED"});

      // assert
      expect(actual.testCount).to.equal(1);
    });

    it("should return a node with passedCount of 1 when supplied resultType is 'PASSED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "PASSED"});

      // assert
      expect(actual.passedCount).to.equal(1);
    });

    it("should return a node with testCount of 1 when supplied resultType is 'PASSED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "PASSED"});

      // assert
      expect(actual.testCount).to.equal(1);
    });

    it("should return a node with passedCount of 1 when supplied resultType is 'SKIPPED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "SKIPPED"});

      // assert
      expect(actual.skippedCount).to.equal(1);
    });

    it("should return a node with testCount of 1 when supplied resultType is 'SKIPPED'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "SKIPPED"});

      // assert
      expect(actual.testCount).to.equal(1);
    });

    it("should return a node with todoCount of 1 when supplied resultType is 'TODO'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "TODO"});

      // assert
      expect(actual.todoCount).to.equal(1);
    });

    it("should return a node with testCount of 1 when supplied resultType is 'TODO'", () => {
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: "TODO"});

      // assert
      expect(actual.testCount).to.equal(1);
    });

    it("should return the node from enrichResultChildren node when supplied unknown resultType", () => {
      // arrange
      const expected = <MeasuredNode> {testCount: 123};
      reporter.enrichResultChildren = () => expected;
      // act
      const actual = reporter.enrichResult(<TestReportNode> {resultType: undefined});

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("enrichResultChildren", () => {
    it("should return a measuredNode that has the sum of child tests", () => {
      // arrange
      const node = <TestReportSuiteNode> {results: [{resultType: "FAILED"}, {resultType: "PASSED"}]};

      // act
      const actual = reporter.enrichResultChildren(node);

      // assert
      expect(actual.testCount).to.equal(2);
    });

    it("should return a measuredNode that has the sum of failed child tests", () => {
      // arrange
      const node = <TestReportSuiteNode> {results: [{resultType: "FAILED"}, {resultType: "FAILED"}, {resultType: "PASSED"}]};

      // act
      const actual = reporter.enrichResultChildren(node);

      // assert
      expect(actual.failedCount).to.equal(2);
    });

    it("should return a measuredNode that has the sum of ignored child tests", () => {
      // arrange
      const node = <TestReportSuiteNode> {results: [{resultType: "IGNORED"}, {resultType: "IGNORED"}, {resultType: "PASSED"}]};

      // act
      const actual = reporter.enrichResultChildren(node);

      // assert
      expect(actual.ignoredCount).to.equal(2);
    });

    it("should return a measuredNode that has the sum of passed child tests", () => {
      // arrange
      const node = <TestReportSuiteNode> {results: [{resultType: "PASSED"}, {resultType: "PASSED"}, {resultType: "FAILED"}]};

      // act
      const actual = reporter.enrichResultChildren(node);

      // assert
      expect(actual.passedCount).to.equal(2);
    });

    it("should return a measuredNode that has the sum of skipped child tests", () => {
      // arrange
      const node = <TestReportSuiteNode> {results: [{resultType: "SKIPPED"}, {resultType: "SKIPPED"}, {resultType: "PASSED"}]};

      // act
      const actual = reporter.enrichResultChildren(node);

      // assert
      expect(actual.skippedCount).to.equal(2);
    });

    it("should return a measuredNode that has the sum of todo child tests", () => {
      // arrange
      const node = <TestReportSuiteNode> {results: [{resultType: "TODO"}, {resultType: "TODO"}, {resultType: "PASSED"}]};

      // act
      const actual = reporter.enrichResultChildren(node);

      // assert
      expect(actual.todoCount).to.equal(2);
    });
  });

  describe("finish", () => {
    it("should return a promise that calls standardConsole.finish", () => {
      // arrange
      const expected = <TestRun>{summary: {runType: "NORMAL"}};
      reporter.build = Sinon.stub();
      reporter.write = Sinon.stub();
      (<SinonStub>reporter.write).resolves();

      // act
      const actual = reporter.finish(expected);

      // assert
      actual.then(() => {
        expect(mockStandardConsole.finish).to.have.been.calledWith(expected);
      });
    });

    it("should return a promise that calls write with the reportFile", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {reportFile: "foo"}});
      reporter.build = Sinon.stub();
      reporter.write = Sinon.stub();
      (<SinonStub>reporter.write).resolves();

      // act
      let actual: Bluebird<void> = undefined;
      revertProgram(() => actual = reporter.finish(<TestRun>{summary: {runType: "NORMAL"}}));

      // assert
      actual.then(() => {
        expect(reporter.write).to.have.been.calledWith("foo", Sinon.match.any);
      });
    });

    it("should return a promise that calls write with the measured results", () => {
      // arrange
      const expected = <MeasuredNode> {label: "foo"};
      reporter.build = Sinon.stub();
      (<SinonStub>reporter.build).returns(expected);
      const revertProgram = RewiredPlugin.__with__({program: {reportFile: "foo"}});
      reporter.write = Sinon.stub();
      (<SinonStub>reporter.write).resolves();

      // act
      let actual: Bluebird<void> = undefined;
      revertProgram(() => actual = reporter.finish(<TestRun>{summary: {}}));

      // assert
      actual.then(() => {
        expect(reporter.write).to.have.been.calledWith(Sinon.match.any, expected);
      });
    });

    it("should return a promise that calls reject when logging fails", () => {
      // arrange
      const expected = new Error("qux");
      reporter.build = Sinon.stub();
      reporter.write = Sinon.stub().throws(expected);

      // act
      const actual = reporter.finish(<TestRun>{summary: {}});

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });

  describe("writeResult", () => {
    it("should call writeLine with the xml file header", () => {
      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {});

      // assert
      expect(mockWriteLine).to.have.been.calledWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    });

    it("should call writeLine for the testsuites node with name attribute value from the label", () => {
      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {label: "foo"});

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testsuites.* name="foo".*>/));
    });

    it("should not call writeLine for the testsuites node with time attribute value from the start and end times", () => {
      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode><{}>{endTime: 3000, startTime: 1000});

      // assert
      expect(mockWriteLine).not.to.have.been.calledWith(Sinon.match(/<testsuites.* time=.*>/));
    });

    it("should not call writeLine for the testsuites node with tests attribute value from the testCount", () => {
      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {testCount: 123});

      // assert
      expect(mockWriteLine).not.to.have.been.calledWith(Sinon.match(/<testsuites.* tests=.*>/));
    });

    it("should not call writeLine for the testsuites node with failures attribute value from the failureCount", () => {
      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {failedCount: 123});

      // assert
      expect(mockWriteLine).not.to.have.been.calledWith(Sinon.match(/<testsuites.* failures=.*>/));
    });

    it("should call writeLine for the end testsuites node", () => {
      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {});

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testsuites>/));
    });

    it("should call writeResultList with the supplied writeLine", () => {
      // arrange
      reporter.writeResultList = Sinon.stub();

      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {label: "foo"});

      // assert
      expect(reporter.writeResultList).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeResultList with the supplied measuredNode.label", () => {
      // arrange
      reporter.writeResultList = Sinon.stub();

      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {label: "foo"});

      // assert
      expect(reporter.writeResultList).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call writeResultList with the supplied node as results when the supplied measuredNode.results are not empty", () => {
      // arrange
      const expected = <MeasuredNode><{}> {label: "foo", results: []};
      reporter.writeResultList = Sinon.stub();

      // act
      reporter.writeResult(mockWriteLine, expected);

      // assert
      expect(reporter.writeResultList).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, [expected], Sinon.match.any);
    });

    it("should call writeResultList with the supplied measuredNode.results when they are not empty", () => {
      // arrange
      const expected = [{}];
      reporter.writeResultList = Sinon.stub();

      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode><{}> {label: "foo", results: expected});

      // assert
      expect(reporter.writeResultList).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeResultList with the reporters paddingUnit", () => {
      // arrange
      reporter.writeResultList = Sinon.stub();

      // act
      reporter.writeResult(mockWriteLine, <MeasuredNode> {label: "foo"});

      // assert
      expect(reporter.writeResultList).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "*");
    });

  });

  describe("writeResultList", () => {
    it("should call self with writeLine when the supplied suite results are undefined and it is a top level result", () => {
      // arrange
      const node = <TestReportSuiteNode> {id: 123, label: "bar", resultType: "FAILED"};
      const mockWriteResultList = Sinon.spy(reporter.writeResultList);
      reporter.writeResultList = mockWriteResultList;

      // act
      reporter.writeResultList(mockWriteLine, "foo", [node], "*");

      // assert
      expect(mockWriteResultList.secondCall.args[0]).to.equal(mockWriteLine);
    });

    it("should call self with node label when the supplied suite results are undefined and it is a top level result", () => {
      // arrange
      const node = <TestReportSuiteNode> {id: 123, label: "bar", resultType: "FAILED"};
      const mockWriteResultList = Sinon.spy(reporter.writeResultList);
      reporter.writeResultList = mockWriteResultList;

      // act
      reporter.writeResultList(mockWriteLine, "foo", [node], "*");

      // assert
      expect(mockWriteResultList.secondCall.args[1]).to.equal("bar");
    });

    it("should call self with faked suite when the supplied suite results are undefined and it is a top level result", () => {
      // arrange
      const node = <TestReportSuiteNode> {id: 123, label: "bar", resultType: "FAILED"};
      const expected = { endTime: undefined, failedCount: 1, id: 123, label: "bar", results: [node], startTime: undefined, testCount: 1};
      const mockWriteResultList = Sinon.spy(reporter.writeResultList);
      reporter.writeResultList = mockWriteResultList;

      // act
      reporter.writeResultList(mockWriteLine, "foo", [node], "*");

      // assert
      expect(mockWriteResultList.secondCall.args[2]).to.deep.equal([expected]);
    });

    it("should call self with supplied padding when the supplied suite results are undefined and it is a top level result", () => {
      // arrange
      const node = <TestReportSuiteNode> {id: 123, label: "bar", resultType: "FAILED"};
      const mockWriteResultList = Sinon.spy(reporter.writeResultList);
      reporter.writeResultList = mockWriteResultList;

      // act
      reporter.writeResultList(mockWriteLine, "foo", [node], "*");

      // assert
      expect(mockWriteResultList.secondCall.args[3]).to.equal("*");
    });

    it("should call writeFailure with the supplied writeLine when the node resultType is 'FAILED'", () => {
      // arrange
      reporter.writeFailure = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportFailedLeaf> {resultType: "FAILED"}], "::");

      // assert
      expect(reporter.writeFailure).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeFailure with the supplied label when the node resultType is 'FAILED'", () => {
      // arrange
      reporter.writeFailure = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportFailedLeaf> {resultType: "FAILED"}], "::");

      // assert
      expect(reporter.writeFailure).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call writeFailure with the supplied leaf node when the node resultType is 'FAILED'", () => {
      // arrange
      reporter.writeFailure = Sinon.spy();
      const expected = <TestReportFailedLeaf> {resultType: "FAILED"};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [expected], "::");

      // assert
      expect(reporter.writeFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeFailure with the supplied padding when the node resultType is 'FAILED'", () => {
      // arrange
      reporter.writeFailure = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportFailedLeaf> {resultType: "FAILED"}], "::");

      // assert
      expect(reporter.writeFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "::");
    });

    it("should call writeIgnored with the supplied writeLine when the node resultType is 'IGNORED'", () => {
      // arrange
      reporter.writeIgnored = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportIgnoredLeaf> {resultType: "IGNORED"}], "::");

      // assert
      expect(reporter.writeIgnored).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeIgnored with the supplied label when the node resultType is 'IGNORED'", () => {
      // arrange
      reporter.writeIgnored = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportIgnoredLeaf> {resultType: "IGNORED"}], "::");

      // assert
      expect(reporter.writeIgnored).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call writeIgnored with the supplied leaf node when the node resultType is 'IGNORED'", () => {
      // arrange
      reporter.writeIgnored = Sinon.spy();
      const expected = <TestReportIgnoredLeaf> {resultType: "IGNORED"};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [expected], "::");

      // assert
      expect(reporter.writeIgnored).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeIgnored with the supplied padding when the node resultType is 'IGNORED'", () => {
      // arrange
      reporter.writeIgnored = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportIgnoredLeaf> {resultType: "IGNORED"}], "::");

      // assert
      expect(reporter.writeIgnored).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "::");
    });

    it("should call writePassed with the supplied writeLine when the node resultType is 'PASSED'", () => {
      // arrange
      reporter.writePassed = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportPassedLeaf> {resultType: "PASSED"}], "::");

      // assert
      expect(reporter.writePassed).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call writePassed with the supplied label when the node resultType is 'PASSED'", () => {
      // arrange
      reporter.writePassed = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportPassedLeaf> {resultType: "PASSED"}], "::");

      // assert
      expect(reporter.writePassed).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call writePassed with the supplied leaf node when the node resultType is 'PASSED'", () => {
      // arrange
      reporter.writePassed = Sinon.spy();
      const expected = <TestReportPassedLeaf> {resultType: "PASSED"};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [expected], "::");

      // assert
      expect(reporter.writePassed).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writePassed with the supplied padding when the node resultType is 'PASSED'", () => {
      // arrange
      reporter.writePassed = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportPassedLeaf> {resultType: "PASSED"}], "::");

      // assert
      expect(reporter.writePassed).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "::");
    });

    it("should call writeSkipped with the supplied writeLine when the node resultType is 'SKIPPED'", () => {
      // arrange
      reporter.writeSkipped = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportSkippedLeaf> {resultType: "SKIPPED"}], "::");

      // assert
      expect(reporter.writeSkipped).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeSkipped with the supplied label when the node resultType is 'SKIPPED'", () => {
      // arrange
      reporter.writeSkipped = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportSkippedLeaf> {resultType: "SKIPPED"}], "::");

      // assert
      expect(reporter.writeSkipped).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call writeSkipped with the supplied leaf node when the node resultType is 'SKIPPED'", () => {
      // arrange
      reporter.writeSkipped = Sinon.spy();
      const expected = <TestReportSkippedLeaf> {resultType: "SKIPPED"};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [expected], "::");

      // assert
      expect(reporter.writeSkipped).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeSkipped with the supplied padding when the node resultType is 'SKIPPED'", () => {
      // arrange
      reporter.writeSkipped = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportSkippedLeaf> {resultType: "SKIPPED"}], "::");

      // assert
      expect(reporter.writeSkipped).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "::");
    });

    it("should call writeTodo with the supplied writeLine when the node resultType is 'TODO'", () => {
      // arrange
      reporter.writeTodo = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportTodoLeaf> {resultType: "TODO"}], "::");

      // assert
      expect(reporter.writeTodo).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeTodo with the supplied label when the node resultType is 'TODO'", () => {
      // arrange
      reporter.writeTodo = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportTodoLeaf> {resultType: "TODO"}], "::");

      // assert
      expect(reporter.writeTodo).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call writeTodo with the supplied leaf node when the node resultType is 'TODO'", () => {
      // arrange
      reporter.writeTodo = Sinon.spy();
      const expected = <TestReportTodoLeaf> {resultType: "TODO"};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [expected], "::");

      // assert
      expect(reporter.writeTodo).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeTodo with the supplied padding when the node resultType is 'TODO'", () => {
      // arrange
      reporter.writeTodo = Sinon.spy();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [<TestReportTodoLeaf> {resultType: "TODO"}], "::");

      // assert
      expect(reporter.writeTodo).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "::");
    });

    it("should recursively call writeResultList with the supplied writeLine when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const expected = [<TestReportFailedLeaf>{resultType: "FAILED"}];
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: expected};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(mockWriteResultList).to.have.been.calledWith(mockWriteLine, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should recursively call writeResultList with the supplied leaf node when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const expected = [<TestReportFailedLeaf>{resultType: "FAILED"}];
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: expected};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(mockWriteResultList).to.have.been.calledWith(Sinon.match.any, "bar", expected, Sinon.match.any);
    });

    it("should recursively call writeResultList with the new padding value when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const expected = [<TestReportFailedLeaf>{resultType: "FAILED"}];
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: expected};

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(reporter.writeResultList).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, "::*");
    });

    it("should call writeTestSuiteStart with the writeLine value when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: [<TestReportFailedLeaf>{resultType: "FAILED"}]};
      reporter.writeTestSuiteStart = Sinon.stub();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(reporter.writeTestSuiteStart).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeTestSuiteStart with the writeLine value when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: [<TestReportFailedLeaf>{resultType: "FAILED"}]};
      reporter.writeTestSuiteStart = Sinon.stub();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(reporter.writeTestSuiteStart).to.have.been.calledWith(Sinon.match.any, suite, Sinon.match.any);
    });

    it("should call writeTestSuiteStart with the padding value when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: [<TestReportFailedLeaf>{resultType: "FAILED"}]};
      reporter.writeTestSuiteStart = Sinon.stub();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(reporter.writeTestSuiteStart).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "::");
    });

    it("should call writeTestSuiteEnd with the writeLine value when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: [<TestReportFailedLeaf>{resultType: "FAILED"}]};
      reporter.writeTestSuiteEnd = Sinon.stub();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(reporter.writeTestSuiteEnd).to.have.been.calledWith(mockWriteLine, Sinon.match.any);
    });

    it("should call writeTestSuiteStart with the padding value when the node resultType is undefined", () => {
      // arrange
      const originalWriteResultList = reporter.writeResultList;
      const mockWriteResultList = Sinon.stub();
      mockWriteResultList.onFirstCall().callsFake(originalWriteResultList);
      reporter.writeResultList = mockWriteResultList;
      const suite = <TestReportSuiteNode><{}>{label: "bar", results: [<TestReportFailedLeaf>{resultType: "FAILED"}]};
      reporter.writeTestSuiteEnd = Sinon.stub();

      // act
      reporter.writeResultList(mockWriteLine, "foo", [suite], "::");

      // assert
      expect(reporter.writeTestSuiteEnd).to.have.been.calledWith(Sinon.match.any, "::");
    });
  });

  describe("writeFailure", () => {
    it("should call writeLine for the testcase node with name attribute value from the label", () => {
      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* name="bar" .*>/));
    });

    it("should call writeLine for the testcase node with time attribute value from the start and end times", () => {
      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {endTime: 3000, startTime: 1000}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* time="2" .*>/));
    });

    it("should call writeLine for the testcase node with classname attribute value from the parent label", () => {
      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* classname="foo".*>/));
    });

    it("should call writeLine for the end testcase node", () => {
      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testcase>/));
    });

    it("should call writeLine for the start failure node", () => {
      // arrange
      const mockFormatFailure = Sinon.stub();
      mockFormatFailure.returns("baz");
      mockHtmlFormatter.formatFailure = mockFormatFailure;

      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<failure>/));
    });

    it("should call writeMessage with failure message", () => {
      // arrange
      reporter.writeMessage = Sinon.spy();
      const expected = "baz";
      reporter.toFailureLogMessage = Sinon.stub();
      (<SinonStub>reporter.toFailureLogMessage).returns(expected);

      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");

      // assert
      expect(reporter.writeMessage).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeLine for the end failure node", () => {
      // act
      reporter.writeFailure(mockWriteLine, "foo", <TestReportFailedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/failure>/));
    });

    it("should call writeDebugLogMessage with the supplied node", () => {
      // arrange
      reporter.writeDebugLogMessage = Sinon.spy();
      const expected = <TestReportFailedLeaf> {label: "bar"};

      // act
      reporter.writeFailure(mockWriteLine, "foo", expected, "::");

      // assert
      expect(reporter.writeDebugLogMessage).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
    });
  });

  describe("writeMessage", () => {
    it("should call writeAsHtml with supplied writeLine when junitFormat is 'html'", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      let rep: JUnitReporter = undefined;
      revertProgram(() => {
        rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.writeAsHtml = Sinon.spy();
        rep.writeMessage(mockWriteLine, "foo", "::");
      });

      // assert
      expect(rep.writeAsHtml).to.have.been.calledWith(mockWriteLine, Sinon.match.any, Sinon.match.any);
    });

    it("should call writeAsHtml with supplied message when junitFormat is 'html'", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      let rep: JUnitReporter = undefined;
      revertProgram(() => {
        rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.writeAsHtml = Sinon.spy();
        rep.writeMessage(mockWriteLine, "foo", "::");
      });

      // assert
      expect(rep.writeAsHtml).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call writeAsHtml with supplied padding when junitFormat is 'html'", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      let rep: JUnitReporter = undefined;
      revertProgram(() => {
        rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.writeAsHtml = Sinon.spy();
        rep.writeMessage(mockWriteLine, "foo", "::");
      });

      // assert
      expect(rep.writeAsHtml).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "::");
    });

    it("should call writeAsText with supplied writeLine when junitFormat is 'text'", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      let rep: JUnitReporter = undefined;
      revertProgram(() => {
        rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.writeAsText = Sinon.spy();
        rep.writeMessage(mockWriteLine, "foo", "::");
      });

      // assert
      expect(rep.writeAsText).to.have.been.calledWith(mockWriteLine, Sinon.match.any);
    });

    it("should call writeAsText with supplied message when junitFormat is 'text'", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");
      const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
      rep.writeAsText = Sinon.spy();

      // act
      revertProgram(() => rep.writeMessage(mockWriteLine, "foo", "::"));

      // assert
      expect(rep.writeAsText).to.have.been.calledWith(Sinon.match.any, "foo");
    });
  });

  describe("writeDebugLogMessage", () => {
    it("should not call writeMessage when logMessages is undefined", () => {
      // arrange
      reporter.writeMessage = Sinon.spy();

      // act
      reporter.writeDebugLogMessage(mockWriteLine, <TestReportLogged> {logMessages: undefined}, "::");

      // assert
      expect(reporter.writeMessage).not.to.have.been.called;
    });

    it("should not call writeMessage when logMessages is empty", () => {
      // arrange
      reporter.writeMessage = Sinon.spy();

      // act
      reporter.writeDebugLogMessage(mockWriteLine, <TestReportLogged> {logMessages: []}, "::");

      // assert
      expect(reporter.writeMessage).not.to.have.been.called;
    });

    it("should call writeLine for the start system-out node", () => {
      // arrange
      const mockFormatFailure = Sinon.stub();
      mockFormatFailure.returns("baz");
      mockHtmlFormatter.formatFailure = mockFormatFailure;

      // act
      reporter.writeDebugLogMessage(mockWriteLine, <TestReportLogged> {logMessages: ["foo"]}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<system-out>/));
    });

    it("should call writeMessage with debug log message returned from toDebugLogMessage", () => {
      // arrange
      reporter.writeMessage = Sinon.spy();
      const expected = "bar";
      reporter.toDebugLogMessage = Sinon.stub();
      (<SinonStub>reporter.toDebugLogMessage).returns(expected);

      // act
      reporter.writeDebugLogMessage(mockWriteLine, <TestReportLogged> {logMessages: ["foo"]}, "::");

      // assert
      expect(reporter.writeMessage).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call writeLine for the end failure node", () => {
      // act
      reporter.writeDebugLogMessage(mockWriteLine, <TestReportLogged> {logMessages: ["foo"]}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/system-out>/));
    });
  });

  describe("toDebugLogMessage", () => {
    it("should call htmlFormatter.formatFailure with the supplied leaf when junitFormat is html", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");
      const expected = <TestReportFailedLeaf> {label: "bar"};

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toDebugLogMessage(expected);
      });

      // assert
      expect(mockHtmlFormatter.formatDebugLogMessages).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call htmlFormatter.formatFailure with empty padding when junitFormat is html", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      let rep: JUnitReporter = undefined;
      revertProgram(() => {
        rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toDebugLogMessage(<TestReportFailedLeaf> {label: "bar"});
      });

      // assert
      expect(mockHtmlFormatter.formatDebugLogMessages).to.have.been.calledWith(Sinon.match.any, "");
    });

    it("should call textFormatter.formatFailure with the supplied leaf when junitFormat is text", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");
      const expected = <TestReportFailedLeaf> {label: "bar"};

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toDebugLogMessage(expected);
      });

      // assert
      expect(mockTextFormatter.formatDebugLogMessages).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call textFormatter.formatFailure with empty padding when junitFormat is text", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toDebugLogMessage(<TestReportFailedLeaf> {label: "bar"});
      });

      // assert
      expect(mockTextFormatter.formatDebugLogMessages).to.have.been.calledWith(Sinon.match.any, "");
    });
  });

  describe("toFailureLogMessage", () => {
    it("should call htmlFormatter.formatFailure with the supplied leaf when junitFormat is html", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");
      const expected = <TestReportFailedLeaf> {label: "bar"};

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toFailureLogMessage(expected);
      });

      // assert
      expect(mockHtmlFormatter.formatFailure).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });

    it("should call htmlFormatter.formatFailure with empty padding when junitFormat is html", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toFailureLogMessage(<TestReportFailedLeaf> {label: "bar"});
      });

      // assert
      expect(mockHtmlFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, "", Sinon.match.any);
    });

    it("should call htmlFormatter.formatFailure with diffMaxLength when junitFormat is html", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {diffMaxLength: 123, junitFormat: "html"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toFailureLogMessage(<TestReportFailedLeaf> {label: "bar"});
      });

      // assert
      expect(mockHtmlFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, 123);
    });

    it("should call textFormatter.formatFailure with the supplied leaf when junitFormat is text", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");
      const expected = <TestReportFailedLeaf> {label: "bar"};

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toFailureLogMessage(expected);
      });

      // assert
      expect(mockTextFormatter.formatFailure).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });

    it("should call textFormatter.formatFailure with empty padding when junitFormat is text", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toFailureLogMessage(<TestReportFailedLeaf> {label: "bar"});
      });

      // assert
      expect(mockTextFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, "", Sinon.match.any);
    });

    it("should call textFormatter.formatFailure with diffMaxLength when junitFormat is text", () => {
      // arrange
      const revertProgram = RewiredPlugin.__with__({program: {diffMaxLength: 123, junitFormat: "text"}});
      const rewiredImp = RewiredPlugin.__get__("JUnitReporter");

      // act
      revertProgram(() => {
        const rep = new rewiredImp(mockLogger, "*", mockStandardConsole, mockHtmlFormatter, mockTextFormatter);
        rep.toFailureLogMessage(<TestReportFailedLeaf> {label: "bar"});
      });

      // assert
      expect(mockTextFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, 123);
    });
  });

  describe("writeFailureAsText", () => {
    it("should call writeLine with the supplied message", () => {
      // act
      reporter.writeAsText(mockWriteLine, "baz");

      // assert
      expect(mockWriteLine).to.have.been.calledWith("baz");
    });
  });

  describe("writeAsHtml", () => {
    it("should call writeLine with the start of a cdata section", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "baz", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<!\[CDATA\[/));
    });

    it("should call writeLine for the end cdata section", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "bar", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/]]>/));
    });

    it("should call writeLine with the message in a pre styled with overflow:auto", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "baz", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<pre style=".*overflow:auto.*">/));
    });

    it("should call writeLine for the end pre node", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "bar", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/pre>/));
    });

    it("should call writeLine with the message in a code styled with display:inline-block", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "baz", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<code style=".*display:inline-block.*">/));
    });

    it("should call writeLine with the message in a code styled with line-height:1", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "baz", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<code style=".*line-height:1.*">/));
    });

    it("should call writeLine with the message in a code block", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "baz", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<code style=".*">baz/));
    });

    it("should call writeLine for the end code node", () => {
      // act
      reporter.writeAsHtml(mockWriteLine, "bar", "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/code>/));
    });
  });

  describe("writeIgnored", () => {
    it("should call writeLine for the testcase node with name attribute value from the label", () => {
      // act
      reporter.writeIgnored(mockWriteLine, "foo", <TestReportIgnoredLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* name="bar" .*>/));
    });

    it("should call writeLine for the testcase node with time attribute value from the start and end times", () => {
      // act
      reporter.writeIgnored(mockWriteLine, "foo", <TestReportIgnoredLeaf> {}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* time="0" .*>/));
    });

    it("should call writeLine for the testcase node with classname attribute value from the parent label", () => {
      // act
      reporter.writeIgnored(mockWriteLine, "foo", <TestReportIgnoredLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* classname="foo".*>/));
    });

    it("should call writeLine for the end testcase node", () => {
      // act
      reporter.writeIgnored(mockWriteLine, "foo", <TestReportIgnoredLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testcase>/));
    });

    it("should call writeLine for the skipped node", () => {
      // act
      reporter.writeIgnored(mockWriteLine, "foo", <TestReportIgnoredLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<skipped><\/skipped>/));
    });
  });

  describe("writePassed", () => {
    it("should call writeLine for the testcase node with name attribute value from the label", () => {
      // act
      reporter.writePassed(mockWriteLine, "foo", <TestReportPassedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* name="bar" .*>/));
    });

    it("should call writeLine for the testcase node with time attribute value from the start and end times", () => {
      // act
      reporter.writePassed(mockWriteLine, "foo", <TestReportPassedLeaf> {endTime: 3000, startTime: 1000}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* time="2" .*>/));
    });

    it("should call writeLine for the testcase node with classname attribute value from the parent label", () => {
      // act
      reporter.writePassed(mockWriteLine, "foo", <TestReportPassedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* classname="foo".*>/));
    });

    it("should call writeLine for the end testcase node", () => {
      // act
      reporter.writePassed(mockWriteLine, "foo", <TestReportPassedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testcase>/));
    });
  });

  describe("writeSkipped", () => {
    it("should call writeLine for the testcase node with name attribute value from the label", () => {
      // act
      reporter.writeSkipped(mockWriteLine, "foo", <TestReportSkippedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* name="bar" .*>/));
    });

    it("should call writeLine for the testcase node with time attribute value from the start and end times", () => {
      // act
      reporter.writeSkipped(mockWriteLine, "foo", <TestReportSkippedLeaf> {}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* time="0" .*>/));
    });

    it("should call writeLine for the testcase node with classname attribute value from the parent label", () => {
      // act
      reporter.writeSkipped(mockWriteLine, "foo", <TestReportSkippedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* classname="foo".*>/));
    });

    it("should call writeLine for the end testcase node", () => {
      // act
      reporter.writeSkipped(mockWriteLine, "foo", <TestReportSkippedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testcase>/));
    });

    it("should call writeLine for the start skipped node with message attribute value from reason", () => {
      // act
      reporter.writeSkipped(mockWriteLine, "foo", <TestReportSkippedLeaf> {label: "bar", reason: "baz"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<skipped.* message="baz".*>/));
    });

    it("should call writeLine for the end skipped node", () => {
      // act
      reporter.writeSkipped(mockWriteLine, "foo", <TestReportSkippedLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/skipped>/));
    });
  });

  describe("writeTestSuiteStart", () => {
    it("should call writeLine for the testsuite node with name attribute value from the label", () => {
      // act
      reporter.writeTestSuiteStart(mockWriteLine, <TestReportSuiteNode> {label: "foo"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testsuite.* name="foo" .*>/));
    });

    it("should call writeLine for the testsuite node with time attribute value from the start and end times", () => {
      // arrange
      const startTime = Date.parse("2001-02-03T01:02:03.456Z");

      // act
      reporter.writeTestSuiteStart(mockWriteLine, <TestReportSuiteNode><{}>{startTime: startTime}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testsuite.* timestamp="2001-02-03T01:02:03.456Z" .*>/));
    });

    it("should call writeLine for the testsuite node with time attribute value from the start and end times", () => {
      // act
      reporter.writeTestSuiteStart(mockWriteLine, <TestReportSuiteNode><{}>{endTime: 3000, startTime: 1000}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testsuite.* time="2".*>/));
    });

    it("should call writeLine for the testsuite node with tests attribute value from the testCount", () => {
      // act
      reporter.writeTestSuiteStart(mockWriteLine, <TestReportSuiteNode><{}> {testCount: 123}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testsuite.* tests="123" .*>/));
    });

    it("should call writeLine for the testsuite node with failures attribute value from the failureCount", () => {
      // act
      reporter.writeTestSuiteStart(mockWriteLine, <TestReportSuiteNode><{}> {failedCount: 123}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testsuite.* failures="123".*>/));
    });
  });

  describe("writeTestSuiteEnd", () => {
    it("should call writeLine for the end testcase node", () => {
      // act
      reporter.writeTestSuiteEnd(mockWriteLine, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testsuite>/));
    });
  });

  describe("writeTodo", () => {
    it("should call writeLine for the testcase node with name attribute value from the label", () => {
      // act
      reporter.writeTodo(mockWriteLine, "foo", <TestReportTodoLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* name="bar" .*>/));
    });

    it("should call writeLine for the testcase node with time attribute value from the start and end times", () => {
      // act
      reporter.writeTodo(mockWriteLine, "foo", <TestReportTodoLeaf> {}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* time="0" .*>/));
    });

    it("should call writeLine for the testcase node with classname attribute value from the parent label", () => {
      // act
      reporter.writeTodo(mockWriteLine, "foo", <TestReportTodoLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<testcase.* classname="foo".*>/));
    });

    it("should call writeLine for the end testcase node", () => {
      // act
      reporter.writeTodo(mockWriteLine, "foo", <TestReportTodoLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<\/testcase>/));
    });

    it("should call writeLine for the skipped node", () => {
      // act
      reporter.writeTodo(mockWriteLine, "foo", <TestReportTodoLeaf> {label: "bar"}, "::");

      // assert
      expect(mockWriteLine).to.have.been.calledWith(Sinon.match(/<skipped><\/skipped>/));
    });
  });


  describe("write", () => {
    it("should write the results to reportFile path", () => {
      // arrange
      reporter.writeResult = Sinon.stub();
      (<SinonStub>reporter.writeResult).returns("baz");
      mockCreateWriteStream.returns({end: (value, cb) => cb()});

      // act
      const actual = reporter.write("foo", [<MeasuredNode>{label: "bar"}]);

      // assert
      actual.then(() => {
        expect(mockCreateWriteStream).to.have.been.calledWith("foo");
      });
    });

    it("should call writeResult with the supplied results", () => {
      // arrange
      const expected = <MeasuredNode>{label: "bar"};
      reporter.writeResult = Sinon.stub();
      (<SinonStub>reporter.writeResult).returns("baz");
      mockCreateWriteStream.returns({end: (value, cb) => cb()});

      // act
      const actual = reporter.write("foo", [expected]);

      // assert
      actual.then(() => {
        expect(reporter.writeResult).to.have.been.calledWith(Sinon.match.any, expected);
      });
    });

    it("should return a promise that calls reject when writeFile fails", () => {
      // arrange
      const expected = new Error("qux");
      mockCreateWriteStream.throws(expected);

      // act
      const actual = reporter.write("foo", [<MeasuredNode>{label: "bar"}]);

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });

  describe("createLineWriter", () => {
    it("should return a function that writes a value to the supplied stream", () => {
      // arrange
      const mockWrite = Sinon.stub();

      // act
      const actual = reporter.createLineWriter(<WriteStream><{}>{write: mockWrite});
      actual("foo");

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(/^foo/));
    });

    it("should return a function that writes a EOL at the end of the value", () => {
      // arrange
      const revertOs = RewiredPlugin.__with__({os: {EOL: "::"}});
      const mockWrite = Sinon.stub();

      // act
      let actual: (line: string) => void = undefined;
      revertOs(() => {
        actual = reporter.createLineWriter(<WriteStream><{}>{write: mockWrite});
        actual("foo");
      });

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(/::$/));
    });
  });
});
