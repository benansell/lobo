"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {createPlugin, DefaultReporterImp} from "../../../../plugin/default-reporter/reporter-plugin";
import {
  PluginReporter,
  ProgressReport,
  RunArgs,
  TestReportFailedLeaf, TestReportPassedLeaf,
  TestReportSkippedLeaf,
  TestReportTodoLeaf, TestResultDecorator,
  TestRun,
  TestRunLeaf,
  TestRunSummary
} from "../../../../lib/plugin";
import {TestResultFormatter} from "../../../../lib/test-result-formatter";
import {Util} from "../../../../lib/util";
import {Chalk} from "chalk";
import {ReporterStandardConsole} from "../../../../lib/reporter-standard-console";
import * as plugin from "../../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("plugin default-reporter reporter-plugin", () => {
  let RewiredPlugin = rewire("../../../../plugin/default-reporter/reporter-plugin");
  let reporter: DefaultReporterImp;
  let mockDecorator: TestResultDecorator;
  let mockFormatter: TestResultFormatter;
  let mockStandardConsole: ReporterStandardConsole;
  let mockLogger: { log(message: string): void };
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
    mockDecorator = <TestResultDecorator> {};
    mockFormatter = <TestResultFormatter> {
      defaultIndentation: Sinon.stub(),
      formatDebugLogMessages: Sinon.stub(),
      formatFailure: Sinon.stub(),
      formatNotRun: Sinon.stub(),
      formatUpdate: Sinon.stub()
    };
    mockStandardConsole = <ReporterStandardConsole> {
      finish: Sinon.stub(),
      paddedLog: Sinon.stub(),
      runArgs: Sinon.stub(),
      update: Sinon.stub()
    };
    mockLogger = {log: Sinon.spy()};
    mockUtil = <Util> {};
    mockUtil.padRight = x => x;
    reporter = new rewiredImp(mockLogger, mockStandardConsole, mockDecorator, mockFormatter, mockUtil);
  });

  describe("createPlugin", () => {
    it("should return reporter", () => {
      // act
      let actual: PluginReporter = createPlugin();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("constructor", () => {
    it("should set diffMaxLength to default of 80 columns when stdout is undefined", () => {
      // arrange
      let revertStdOut = RewiredPlugin.__with__({process: {stdout: undefined}});
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");

      // act
      let actual = new rewiredImp(mockLogger, mockStandardConsole, mockDecorator, mockFormatter, mockUtil);
      revertStdOut(() => actual.logFailureMessage(<plugin.TestRunLeaf<plugin.TestReportFailedLeaf>> {}));

      // assert
      expect(mockFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, 80);
    });

    it("should set diffMaxLength with default of 80 columns when stdout.columns is undefined", () => {
      // arrange
      let revertStdOutColumns = RewiredPlugin.__with__({process: {stdout: {columns: undefined}}});
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");

      // act
      let actual = new rewiredImp(mockLogger, mockStandardConsole, mockDecorator, mockFormatter, mockUtil);
      revertStdOutColumns(() => actual.logFailureMessage(<plugin.TestRunLeaf<plugin.TestReportFailedLeaf>> {}));

      // assert
      expect(mockFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any,  80);
    });

    it("should set diffMaxLength with std.columns minus message prefix padding length when stdout.columns exists", () => {
      // arrange
      let revertStdOutColumns = RewiredPlugin.__with__({process: {stdout: {columns: 10}}});
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");

      // act
      revertStdOutColumns(() => {
        let actual = new rewiredImp(mockLogger, mockStandardConsole, mockDecorator, mockFormatter, mockUtil);
        actual.logFailureMessage(<plugin.TestRunLeaf<plugin.TestReportFailedLeaf>> {})
      });

      // assert
      expect(mockFormatter.formatFailure).to.have.been.calledWith(Sinon.match.any, Sinon.match.any,  6);
    });
  });

  describe("runArgs", () => {
    it("should call reporter standard console with supplied initArgs", () => {
      // arrange
      let expected = <RunArgs> {runCount: 123};

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
      let result = <ProgressReport>{resultType: "PASSED"};

      // act
      reporter.update(result);

      // assert
      expect(mockStandardConsole.update).to.have.been.calledWith(result);
    });
  });

  describe("finish", () => {
    it("should return a promise that calls standardConsole.finish", () => {
      // arrange
      let expected = <TestRun>{summary: {runType: "NORMAL"}};
      reporter.logResults = Sinon.spy();

      // act
      let actual = reporter.finish(expected);

      // assert
      actual.then(() => {
        expect(mockStandardConsole.finish).to.have.been.calledWith(expected);
      });
    });

    it("should return a promise that does not call logNonPassed when quiet is true", () => {
      // arrange
      let expected = <TestRunSummary> {runType: "NORMAL", successes: []};
      let revert = RewiredPlugin.__with__({program: {quiet: true}});
      reporter.logResults = Sinon.spy();

      // act
      let actual: Bluebird<void> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: expected}));

      // assert
      actual.then(() => {
        expect(reporter.logResults).not.to.have.been.called;
      });
    });

    it("should return a promise that calls logNonPassed when quiet is false", () => {
      // arrange
      let expected = <TestRunSummary> {runType: "NORMAL"};
      let revert = RewiredPlugin.__with__({program: {quiet: false}});
      reporter.logResults = Sinon.spy();

      // act
      let actual: Bluebird<void> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: expected}));

      // assert
      actual.then(() => {
        expect(reporter.logResults).to.have.been.calledWith(expected);
      });
    });

    it("should return a promise that calls reject when logging fails", () => {
      // arrange
      let expected = new Error("qux");
      let revert = RewiredPlugin.__with__({program: {quiet: false}});
      reporter.logResults = Sinon.stub();
      (<SinonStub>reporter.logResults).throws(expected);

      // act
      let actual: Bluebird<void> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: {}}));

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });

  describe("sortItemsByLabel", () => {
    it("should return an empty array when the supplied items are undefined", () => {
      // act
      let actual = reporter.sortItemsByLabel(undefined);

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return the items sorted by order of labels when they differ by result.label", () => {
      // arrange
      let items = <TestRunLeaf<TestReportFailedLeaf>[]>[
        {labels: [], result: {label: "1"}},
        {labels: [], result: {label: "2"}},
        {labels: [], result: {label: "3"}}
      ];

      // act
      let actual = reporter.sortItemsByLabel(items);

      // assert
      expect(actual[0].result.label).to.equal("1");
      expect(actual[1].result.label).to.equal("2");
      expect(actual[2].result.label).to.equal("3");
    });

    it("should return the items sorted by order of labels when they differ by labels", () => {
      // arrange
      let items = <TestRunLeaf<TestReportFailedLeaf>[]>[
        {labels: ["suite A"], result: {label: "1"}},
        {labels: ["suite B"], result: {label: "1"}},
        {labels: ["suite C"], result: {label: "1"}}
      ];

      // act
      let actual = reporter.sortItemsByLabel(items);

      // assert
      expect(actual[0].labels).to.include("suite A");
      expect(actual[1].labels).to.include("suite B");
      expect(actual[2].labels).to.include("suite C");
    });

    it("should return the items sorted by order of labels when they differ by labels and result.label", () => {
      // arrange
      let items = <TestRunLeaf<TestReportFailedLeaf>[]>[
        {labels: ["suite A", "a"], result: {label: "1"}},
        {labels: ["suite B", "b"], result: {label: "2"}},
        {labels: ["suite A", "b", "c"], result: {label: "3"}}
      ];

      // act
      let actual = reporter.sortItemsByLabel(items);

      // assert
      expect(actual[0].result.label).to.equal("1");
      expect(actual[1].result.label).to.equal("3");
      expect(actual[2].result.label).to.equal("2");
    });
  });

  describe("logResults", () => {
    it("should log failed items", () => {
      // arrange
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportFailedLeaf>> {labels: [], result: {label: "foo"}};

      // act
      reporter.logResults(<TestRunSummary>{failures: [expected]});

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected);
    });

    it("should log passed items when hideDebugMessages is false and resultType is 'PASSED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: false}});
      reporter.logPassedMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportPassedLeaf>>{labels: [], result: {label: "foo", resultType: "PASSED", logMessages: ["bar"]}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], successes: [expected]}));

      // assert
      expect(reporter.logPassedMessage).to.have.been.calledWith(expected);
    });

    it("should not log passed items when hideDebugMessages is false and resultType is 'PASSED' and no log messages", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: false}});
      reporter.logPassedMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportPassedLeaf>>{labels: [], result: {label: "foo", resultType: "PASSED", logMessages: []}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], successes: [expected]}));

      // assert
      expect(reporter.logPassedMessage).not.to.have.been.called;
    });

    it("should not log passed items when hideDebugMessages is true and resultType is 'PASSED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: true}});
      reporter.logPassedMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportPassedLeaf>>{labels: [], result: {label: "foo", resultType: "PASSED", logMessages: ["bar"]}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], successes: [expected]}));

      // assert
      expect(reporter.logPassedMessage).not.to.have.been.called;
    });

    it("should not log skipped items when showSkip is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: false}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{labels: [], result: {label: "foo"}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logFailureMessage).not.to.have.been.called;
    });

    it("should log skipped items as failure when showSkip is true and resultType is not 'SKIPPED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: true}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{labels: [], result: {label: "foo", resultType: "IGNORED"}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected);
    });

    it("should log skipped items as not run when showSkip is true and resultType is 'SKIPPED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: true}});
      reporter.logNotRunMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{labels: [], result: {label: "foo", resultType: "SKIPPED"}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logNotRunMessage).to.have.been.calledWith(expected);
    });

    it("should not log todo items when showTodo is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: false}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{labels: [], result: {label: "foo"}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], todo: [expected]}));

      // assert
      expect(reporter.logFailureMessage).not.to.have.been.called;
    });

    it("should log todo items as failure when showTodo is true and resultType is not 'TODO'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: true}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{labels: [], result: {label: "foo", resultType: "IGNORED"}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], todo: [expected]}));

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected);
    });

    it("should log todo items as not run when showTodo is true and resultType is 'TODO'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: true}});
      reporter.logNotRunMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{labels: [], result: {label: "foo", resultType: "TODO"}};

      // act
      revert(() => reporter.logResults(<TestRunSummary>{failures: [], todo: [expected]}));

      // assert
      expect(reporter.logNotRunMessage).to.have.been.calledWith(expected);
    });
  });

  describe("logLabels", () => {
    let revertLabelStyle: () => void;

    beforeEach(() => {
      revertLabelStyle = RewiredPlugin.__set__({chalk_1: { "default": {dim: x => x}}});
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      reporter = new rewiredImp(mockFormatter, mockStandardConsole, mockLogger, mockUtil);
    });

    afterEach(() => {
      revertLabelStyle();
    });

    it("should not pad top label", () => {
      // arrange
      let mockStyle = <Chalk><{}> Sinon.stub();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(mockStandardConsole.paddedLog).to.have.been.calledWith("foo");
    });

    it("should pad child label", () => {
      // arrange
      let mockStyle = <Chalk><{}> Sinon.stub();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(mockStandardConsole.paddedLog).to.have.been.calledWith(" bar");
    });

    it("should not log labels that are in the context", () => {
      // arrange
      let mockStyle = <Chalk><{}> Sinon.stub();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, ["foo"], mockStyle);

      // assert
      expect(mockStandardConsole.paddedLog).not.to.have.been.calledWith("foo");
    });

    it("should pad item label", () => {
      // arrange
      let mockStyle = <Chalk><{}> (x => x);

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(mockStandardConsole.paddedLog).to.have.been.calledWith(Sinon.match(/[ ]{4}.*baz/));
    });

    it("should add number prefix to item label", () => {
      // arrange
      let mockStyle = <Chalk><{}> (x => x);

      // act
      reporter.logLabels(["foo", "bar"], "baz", 123, [], mockStyle);

      // assert
      expect(mockStandardConsole.paddedLog).to.have.been.calledWith(Sinon.match(/.*123\) baz/));
    });
  });

  describe("logFailureMessage", () => {
    it("should log the message returned by formatFailure", () => {
      // arrange
      (<SinonStub>mockFormatter.formatFailure).returns("bar");

      // act
      reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {labels: [], result: {label: "foo"}});

      // assert
      expect(mockLogger.log).to.have.been.calledWith("bar");
    });

    it("should log the debug log message returned by formatDebugLogMessages when hideDebugMessages is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: false}});
      (<SinonStub>mockFormatter.formatDebugLogMessages).returns("bar");

      // act
      revert(() => reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {labels: [], result: {label: "foo"}}));

      // assert
      expect(mockLogger.log).to.have.been.calledWith("bar");
    });

    it("should not log the debug log message returned by formatDebugLogMessages when hideDebugMessages is true", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: true}});
      (<SinonStub>mockFormatter.formatDebugLogMessages).returns("bar");

      // act
      revert(() => reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {labels: [], result: {label: "foo"}}));

      // assert
      expect(mockLogger.log).not.to.have.been.calledWith("bar");
    });
  });

  describe("logPassedMessage", () => {
    it("should log the debug log message returned by formatDebugLogMessages when hideDebugMessages is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: false}});
      (<SinonStub>mockFormatter.formatDebugLogMessages).returns("bar");

      // act
      revert(() => reporter.logPassedMessage(<TestRunLeaf<TestReportPassedLeaf>> {labels: [], result: {label: "foo"}}));

      // assert
      expect(mockLogger.log).to.have.been.calledWith("bar");
    });

    it("should not log the debug log message returned by formatDebugLogMessages when hideDebugMessages is true", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {hideDebugMessages: true}});
      (<SinonStub>mockFormatter.formatDebugLogMessages).returns("bar");

      // act
      revert(() => reporter.logPassedMessage(<TestRunLeaf<TestReportPassedLeaf>> {labels: [], result: {label: "foo"}}));

      // assert
      expect(mockLogger.log).not.to.have.been.called;
    });
  });

  describe("logNotRunMessage", () => {
    it("should log the message returned by formatNotRun", () => {
      // arrange
      (<SinonStub>mockFormatter.formatNotRun).returns("bar");

      // act
      reporter.logNotRunMessage(<TestRunLeaf<TestReportSkippedLeaf>> {result: {reason: "foo"}});

      // assert
      expect(mockLogger.log).to.have.been.calledWith("bar");
    });
  });
});
