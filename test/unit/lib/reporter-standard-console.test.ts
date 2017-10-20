"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {
  ProgressReport,
  RunArgs,
  TestResultDecorator,
  TestRun,
  TestRunFailState,
  TestRunSummary
} from "../../../lib/plugin";
import {Util} from "../../../lib/util";
import {TestResultFormatter} from "../../../lib/test-result-formatter";
import {createReporterStandardConsole, ReporterStandardConsole, ReporterStandardConsoleImp} from "../../../lib/reporter-standard-console";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib reporter-standard-console", () => {
  let RewiredPlugin = rewire("../../../lib/reporter-standard-console");
  let reporter: ReporterStandardConsoleImp;
  let mockDecorator: TestResultDecorator;
  let mockFormatter: TestResultFormatter;
  let mockLogger: { log(message: string): void };
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("ReporterStandardConsoleImp");
    mockDecorator = <TestResultDecorator> {
      failed: x => x,
      passed: x => x
    };
    mockFormatter = <TestResultFormatter> {
      defaultIndentation: () => "",
      formatNotRun: Sinon.stub(),
      formatFailure: Sinon.stub(),
      formatUpdate: Sinon.stub()
    };
    mockLogger = {log: Sinon.spy()};
    mockUtil = <Util> {};
    mockUtil.padRight = x => x;
    reporter = new rewiredImp(mockLogger, mockDecorator, mockFormatter, mockUtil);
  });

  describe("createReporterStandardConsole", () => {
    it("should return reporter", () => {
      // act
      let actual: ReporterStandardConsole = createReporterStandardConsole();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("runArgs", () => {
    it("should set initArgs to supplied value that is output in summary", () => {
      // arrange
      let expected = <RunArgs> {runCount: 123};
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.runArgs(expected);
      reporter.logSummary(<TestRunSummary>{}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith("runCount: 123");
    });
  });

  describe("update", () => {
    it("should report output from test result formatter", () => {
      // arrange
      let mockWrite = Sinon.stub();
      let revert = RewiredPlugin.__with__({process: {stdout: { write: mockWrite}}});
      (<SinonStub>mockFormatter.formatUpdate).returns("foo");
      let result = <ProgressReport>{resultType: "PASSED"};

      // act
      revert(() => reporter.update(result));

      // assert
      expect(mockFormatter.formatUpdate).to.have.been.calledWith(result);
      expect(mockWrite).to.have.been.calledWith("foo");
    });
  });

  describe("finish", () => {
    it("should only log the summary header info when quiet is true", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {quiet: true}});
      reporter.logSummaryHeader = Sinon.spy();
      reporter.logSummary = Sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: summary}));

      // assert
      expect(reporter.logSummary).not.to.have.been.called;
      expect(reporter.logSummaryHeader).to.have.been.calledWith(summary, Sinon.match.any);
    });

    it("should only log the summary header failState when quiet is true", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {quiet: true}});
      reporter.logSummaryHeader = Sinon.spy();
      reporter.logSummary = Sinon.spy();
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{failState: failState}));

      // assert
      expect(reporter.logSummary).not.to.have.been.called;
      expect(reporter.logSummaryHeader).to.have.been.calledWith(Sinon.match.any, failState);
    });

    it("should log the full summary info when quiet is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {quiet: false}});
      reporter.logSummary = Sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: summary}));

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(summary, Sinon.match.any);
    });

    it("should only log the summary header failState when quiet is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {quiet: false}});
      reporter.logSummary = Sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: summary, failState: failState}));

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(Sinon.match.any, failState);
    });

    it("should return a promise that calls reject when log summary fails", () => {
      // arrange
      let expected = new Error("qux");
      let revert = RewiredPlugin.__with__({program: {quiet: false}});
      reporter.logSummary = Sinon.stub();
      (<SinonStub>reporter.logSummary).throws(expected);

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: {}}));

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });

  describe("logSummary", () => {
    let revertFramework: () => void;

    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("ReporterStandardConsoleImp");
      mockDecorator.failed = Sinon.spy();
      mockDecorator.inconclusive = Sinon.spy();
      mockDecorator.only = Sinon.spy();
      mockDecorator.passed = Sinon.spy();
      mockDecorator.skip = Sinon.spy();
      mockDecorator.todo = Sinon.spy();
      reporter = new rewiredImp(mockLogger, mockDecorator, mockFormatter, mockUtil);
    });

    afterEach(() => {
      if (revertFramework) {
        revertFramework();
      }
    });

    it("should log the passed count with the passedStyle", () => {
      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.passed).to.have.been.calledWith(Sinon.match(/123/));
    });

    it("should log the passed count with 'Passed:' prefix", () => {
      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.passed).to.have.been.calledWith(Sinon.match(/Passed:/));
    });

    it("should log the passed count with prefix that is 10 char long", () => {
      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.passed).to.have.been.calledWith(Sinon.match(/^.{10}123$/));
    });

    it("should log the failed count with the failedStyle", () => {
      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith(Sinon.match(/123/));
    });

    it("should log the failed count with 'Failed:' prefix", () => {
      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith(Sinon.match(/Failed:/));
    });

    it("should log the failed count with prefix that is 10 char long", () => {
      // arrange
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith(Sinon.match(/^.{10}123$/));
    });

    it("should not log the todo count when it is zero", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.todo).not.to.have.been.calledWith(Sinon.match(/Todo:/));
    });

    it("should log the todo count with the todoStyle", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.todo).to.have.been.calledWith(Sinon.match(/123/));
    });

    it("should log the todo count with 'Todo:' prefix", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.todo).to.have.been.calledWith(Sinon.match(/Todo:/));
    });

    it("should log the todo count with prefix that is 10 char long", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.todo).to.have.been.calledWith(Sinon.match(/^.{10}123$/));
    });

    it("should not log the skipped count when it is non-zero and framework is 'elm-test'", () => {
      // arrange
      revertFramework = RewiredPlugin.__set__({program: {framework: 'elm-test'}});

      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.skip).not.to.have.been.calledWith(Sinon.match(/Skipped:/));
    });

    it("should not log the skipped count when it is zero and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.skip).not.to.have.been.calledWith(Sinon.match(/Skipped:/));
    });

    it("should log the skipped count with the skippedStyle and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.skip).to.have.been.calledWith(Sinon.match(/123/));
    });

    it("should log the skipped count with 'Skipped:' prefix and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.skip).to.have.been.calledWith(Sinon.match(/Skipped:/));
    });

    it("should log the skipped count with prefix that is 10 char long and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.skip).to.have.been.calledWith(Sinon.match(/^.{10}123$/));
    });

    it("should not log the only count when it is non-zero and framework is 'elm-test'", () => {
      // arrange
      revertFramework = RewiredPlugin.__set__({program: {framework: 'elm-test'}});

      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.only).not.to.have.been.calledWith(Sinon.match(/Ignored:/));
    });

    it("should not log the only count when it is zero and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.only).not.to.have.been.calledWith(Sinon.match(/Ignored:/));
    });

    it("should log the only count with the onlyStyle and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.only).to.have.been.calledWith(Sinon.match(/123/));
    });

    it("should log the only count with 'Ignored:' prefix and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.only).to.have.been.calledWith(Sinon.match(/Ignored:/));
    });

    it("should log the only count with prefix that is 10 char long and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.only).to.have.been.calledWith(Sinon.match(/^.{10}123$/));
    });

    it("should not log the duration when it is undefined", () => {
      // act
      reporter.logSummary(<TestRunSummary>{durationMilliseconds: undefined}, <TestRunFailState>{});

      // assert
      expect(mockDecorator.only).not.to.have.been.calledWith(Sinon.match(/Duration:/));
    });

    it("should log the duration with 'Duration:' prefix", () => {
      // arrange
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{durationMilliseconds: 123}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(Sinon.match(/Duration:/));
    });

    it("should log the duration with value and 'ms' suffix", () => {
      // arrange
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{durationMilliseconds: 123}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(Sinon.match(/123ms/));
    });

    it("should log the initArgs", () => {
      // arrange
      reporter.paddedLog = Sinon.spy();
      reporter.runArgs(<RunArgs> {runCount: 123});

      // act
      reporter.logSummary(<TestRunSummary>{}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(Sinon.match(/runCount: 123/));
    });
  });

  describe("logSummaryHeader", () => {
    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("ReporterStandardConsoleImp");
      mockDecorator.failed = Sinon.spy();
      mockDecorator.passed = Sinon.spy();
      mockDecorator.inconclusive = Sinon.spy();
      reporter = new rewiredImp(mockLogger, mockDecorator, mockFormatter, mockUtil);
    });

    it("should use an outcomeStyle of failed when the failed count is non-zero", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{failedCount: 123, outcome: "foo"}, <TestRunFailState> {});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.only does not exist", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: undefined, skip: {}, todo: {}});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.skip does not exist", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: undefined, todo: {}});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.todo does not exist", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: undefined});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.only is a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {isFailure: true}, skip: {}, todo: {}});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.skip is a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {isFailure: true}, todo: {}});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.todo is a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: {isFailure: true}});

      // assert
      expect(mockDecorator.failed).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of inconclusive when failState.skip.exists is true", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {exists: true}, todo: {}});

      // assert
      expect(mockDecorator.inconclusive).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of inconclusive when failState.todo.exists is true", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: {exists: true}});

      // assert
      expect(mockDecorator.inconclusive).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of passed when everything has run and not a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: {}});

      // assert
      expect(mockDecorator.passed).to.have.been.calledWith("foo");
    });
  });

  describe("paddedLog", () => {
    it("should log undefined as empty string", () => {
      // act
      reporter.paddedLog(undefined);

      // assert
      expect(mockLogger.log).to.have.been.calledWith("");
    });

    it("should log message with default indentation from test result formatter", () => {
      // arrange
      mockFormatter.defaultIndentation = () => "  ";

      // act
      reporter.paddedLog("foo");

      // assert
      expect(mockLogger.log).to.have.been.calledWith("  foo");
    });
  });
});
