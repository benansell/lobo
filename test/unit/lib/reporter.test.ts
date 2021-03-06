"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as SinonChai from "sinon-chai";
import {createReporter, Reporter, ReporterImp} from "../../../lib/reporter";
import {
  PluginReporter, ProgressReport, RunArgs, TestReportFailedLeaf, TestReportNode, TestReportRoot, TestReportSuiteNode, TestRun,
  TestRunFailState,
  TestRunSummary
} from "../../../lib/plugin";

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib reporter", () => {
  const RewiredReporter = rewire("./../../../lib/reporter");
  let reporter: ReporterImp;
  let mockReporterPlugin: PluginReporter;

  beforeEach(() => {
    const rewiredImp = RewiredReporter.__get__("ReporterImp");
    reporter = new rewiredImp();
    mockReporterPlugin = <PluginReporter> {finish: Sinon.stub(), init: Sinon.spy(), runArgs: Sinon.spy(), update: Sinon.spy()};
    reporter.configure(mockReporterPlugin);
    reporter.testDebugLogMessages = [];
  });

  describe("createReporter", () => {
    it("should return reporter", () => {
      // act
      const actual: Reporter = createReporter();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("runArgs", () => {
    it("should call plugin.runArgs with the supplied args", () => {
      // arrange
      const expected = <RunArgs> {runCount: 123};

      // act
      reporter.runArgs(expected);

      // assert
      expect(mockReporterPlugin.runArgs).to.have.been.calledWith(expected);
    });
  });

  describe("init", () => {
    it("should call plugin.init with the supplied args", () => {
      // arrange
      const expected = 123;

      // act
      reporter.init(expected);

      // assert
      expect(mockReporterPlugin.init).to.have.been.calledWith(expected);
    });
  });

  describe("update", () => {
    it("should report nothing when program.quiet is true", () => {
      // arrange
      const revertProgram = RewiredReporter.__with__({program: {quiet: true}});

      // act
      revertProgram(() => reporter.update(<ProgressReport> {resultType: "PASSED"}, []));

      // assert
      expect(mockReporterPlugin.update).not.to.have.been.called;
    });

    it("should call reporter.update when program.quiet is false", () => {
      // arrange
      const revertProgram = RewiredReporter.__with__({program: {quiet: false}});

      // act
      revertProgram(() => reporter.update(<ProgressReport> {resultType: "PASSED"}, []));

      // assert
      expect(mockReporterPlugin.update).to.have.been.called;
    });

    it("should add the supplied debugLogMessages to the testDebugLogMessages list with the result id", () => {
      // arrange
      const revertProgram = RewiredReporter.__with__({program: {quiet: false}});
      const messages = ["foo"];

      // act
      revertProgram(() => reporter.update(<ProgressReport> {id: 123, resultType: "PASSED"}, messages));

      // assert
      expect(reporter.testDebugLogMessages).to.include.something.that.deep.equals({id: 123, debugLogMessages: messages});
    });
  });

  describe("finish", () => {
    it("should call processResults with the supplied raw results", () => {
      // arrange
      const expected = <TestReportRoot>{runType: "NORMAL"};
      reporter.processResults = Sinon.stub();
      (<SinonStub>reporter.processResults).returns(<TestRun>{summary: {}});
      (<SinonStub>mockReporterPlugin.finish).returns({then: Sinon.stub(), return: Sinon.stub()});

      // act
      reporter.finish(expected);

      // assert
      expect(reporter.processResults).to.have.been.calledWith(expected);
    });

    it("should call plugin.finish with the processed results", () => {
      // arrange
      const expected = <TestRun> {summary: {outcome: "PASSED"}};
      reporter.processResults = Sinon.stub();
      (<SinonStub>reporter.processResults).returns(expected);
      (<SinonStub>mockReporterPlugin.finish).returns({then: Sinon.stub()});

      // act
      reporter.finish(<TestReportRoot>{});

      // assert
      expect(mockReporterPlugin.finish).to.have.been.calledWith(expected);
    });

    it("should return a promise that resolves when the results are a success", () => {
      // arrange
      const expected = <TestRun> {summary: {success: true}};
      reporter.processResults = Sinon.stub();
      (<SinonStub>reporter.processResults).returns(expected);
      let onFulfill: Function = undefined;
      (<SinonStub>mockReporterPlugin.finish).returns({ then: func => onFulfill = func});

      // act
      reporter.finish(<TestReportRoot>{});

      // assert
      expect(onFulfill()).not.to.throw;
    });

    it("should return a promise that rejects when the results are a failure", () => {
      // arrange
      const expected = <TestRun> {summary: {success: false}};
      reporter.processResults = Sinon.stub();
      (<SinonStub>reporter.processResults).returns(expected);
      let onFulfill: Function = undefined;
      (<SinonStub>mockReporterPlugin.finish).returns({ then: func => onFulfill = func});

      // act
      reporter.finish(<TestReportRoot>{});

      // assert
      expect(() => onFulfill()).to.throw("Failed");
    });
  });

  describe("processResults", () => {
    it("should return a summary with durationMilliseconds calculated from start and end times", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {startTime: 150, endTime: 200});

      // assert
      expect(actual.summary.durationMilliseconds).to.equal(50);
    });

    it("should return a failState with only exists false when the only count is zero", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.only.exists).to.be.false;
    });

    it("should return a failState with only exists true when the only count is greater than zero", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "IGNORED"}]});

      // assert
      expect(actual.failState.only.exists).to.be.true;
    });

    it("should return a failState with only exists false when the only count is zero and runType is not 'FOCUS'", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runType: "NORMAL", runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.only.exists).to.be.false;
    });

    it("should return a failState with only exists true when the only count is zero and runType is 'FOCUS'", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runType: "FOCUS", runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.only.exists).to.be.true;
    });

    it("should return a failState with skip exists false when the skip count is zero", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.skip.exists).to.be.false;
    });

    it("should return a failState with skip exists true when the skip count is greater than zero", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "SKIPPED"}]});

      // assert
      expect(actual.failState.skip.exists).to.be.true;
    });

    it("should return a failState with skip exists false when the skip count is zero and runType is not 'SKIP'", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runType: "NORMAL", runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.skip.exists).to.be.false;
    });

    it("should return a failState with skip exists true when the skip count is zero and runType is 'SKIP'", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runType: "SKIP", runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.skip.exists).to.be.true;
    });

    it("should return a failState with todo exists false when the todo count is zero", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.failState.todo.exists).to.be.false;
    });

    it("should return a failState with todo exists true when the todo count is greater than zero", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "TODO"}]});

      // assert
      expect(actual.failState.todo.exists).to.be.true;
    });

    it("should return a summary with success true when there are no failed tests", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "PASSED"}]});

      // assert
      expect(actual.summary.success).to.be.true;
    });

    it("should return a summary with success false when there are failed tests", () => {
      // act
      const actual = reporter.processResults(<TestReportRoot> {runResults: [{resultType: "FAILED"}]});

      // assert
      expect(actual.summary.success).to.be.false;
    });

    it("should return a summary with success false when fail on only is true and focused tests exist", () => {
      // arrange
      const revert = RewiredReporter.__with__({program: {failOnOnly: true}});

      // act
      let actual: TestRun = undefined;
      revert(() => actual = reporter.processResults(<TestReportRoot> {runType: "FOCUS", runResults: [{resultType: "PASSED"}]}));

      // assert
      expect(actual.summary.success).to.be.false;
    });

    it("should return a summary with success false when fail on skip is true and skipped tests exist", () => {
      // arrange
      const revert = RewiredReporter.__with__({program: {failOnSkip: true}});

      // act
      let actual: TestRun = undefined;
      revert(() => actual = reporter.processResults(<TestReportRoot> {runType: "NORMAL", runResults: [{resultType: "SKIPPED"}]}));

      // assert
      expect(actual.summary.success).to.be.false;
    });

    it("should return a summary with success false when fail on skip is true and todo tests exist", () => {
      // arrange
      const revert = RewiredReporter.__with__({program: {failOnTodo: true}});

      // act
      let actual: TestRun = undefined;
      revert(() => actual = reporter.processResults(<TestReportRoot> {runType: "NORMAL", runResults: [{resultType: "TODO"}]}));

      // assert
      expect(actual.summary.success).to.be.false;
    });
  });

  describe("processTestResults", () => {
    it("should not update the summary when the results do not exist", () => {
      // arrange
      const expected = <TestRunSummary> {};

      // act
      reporter.processTestResults(undefined, expected, []);

      // assert
      expect(expected).to.deep.equal({});
    });

    it("should update the summary failedCount when results contains a failed result", () => {
      // arrange
      const expected = <TestRunSummary> {failedCount: 0, failures: []};

      // act
      reporter.processTestResults([<TestReportNode>{resultType: "FAILED"}], expected, []);

      // assert
      expect(expected.failedCount).to.equal(1);
    });

    it("should update the summary failures when results contains the failed result with labels", () => {
      // arrange
      const expected = <TestRunSummary> {failedCount: 0, failures: []};
      const result = <TestReportNode>{resultType: "FAILED"};

      // act
      reporter.processTestResults([result], expected, ["foo"]);

      // assert
      expect(expected.failures).to.include.something.deep.equal({labels: ["foo"], result: result});
    });

    it("should update the summary failures when results contains the failed result with log messages", () => {
      // arrange
      const summary = <TestRunSummary> {failedCount: 0, failures: []};
      reporter.toLoggedResult = Sinon.stub();
      const expected = <TestReportFailedLeaf>{resultType: "FAILED", logMessages: ["bar"]};
      (<SinonStub>reporter.toLoggedResult).returns(expected);
      const result = <TestReportNode>{resultType: "FAILED"};

      // act
      reporter.processTestResults([result], summary, ["foo"]);

      // assert
      expect(summary.failures).to.include.something.deep.equal({labels: ["foo"], result: expected});
    });

    it("should update the summary onlyCount when results contains an ignored result", () => {
      // arrange
      const expected = <TestRunSummary> {onlyCount: 0, successes: []};

      // act
      reporter.processTestResults([<TestReportNode>{resultType: "IGNORED"}], expected, []);

      // assert
      expect(expected.onlyCount).to.equal(1);
    });

    it("should update the summary passedCount when results contains an passed result", () => {
      // arrange
      const expected = <TestRunSummary> {passedCount: 0, successes: []};

      // act
      reporter.processTestResults([<TestReportNode>{resultType: "PASSED"}], expected, []);

      // assert
      expect(expected.passedCount).to.equal(1);
    });

    it("should update the summary successes when results contains the passed result with log messages", () => {
      // arrange
      const summary = <TestRunSummary> {passedCount: 0, successes: []};
      reporter.toLoggedResult = Sinon.stub();
      const expected = <TestReportFailedLeaf>{resultType: "PASSED", logMessages: ["bar"]};
      (<SinonStub>reporter.toLoggedResult).returns(expected);
      const result = <TestReportNode>{resultType: "PASSED"};

      // act
      reporter.processTestResults([result], summary, ["foo"]);

      // assert
      expect(summary.successes).to.include.something.deep.equal({labels: ["foo"], result: expected});
    });

    it("should update the summary skippedCount when results contains a skipped result", () => {
      // arrange
      const expected = <TestRunSummary> {skippedCount: 0, skipped: []};

      // act
      reporter.processTestResults([<TestReportNode>{resultType: "SKIPPED"}], expected, []);

      // assert
      expect(expected.skippedCount).to.equal(1);
    });

    it("should update the summary failures when results contains the skipped result with labels", () => {
      // arrange
      const expected = <TestRunSummary> {skippedCount: 0, skipped: []};
      const result = <TestReportNode>{resultType: "SKIPPED"};

      // act
      reporter.processTestResults([result], expected, ["foo"]);

      // assert
      expect(expected.skipped).to.include.something.deep.equal({labels: ["foo"], result: result});
    });

    it("should update the summary todoCount when results contains a todo result", () => {
      // arrange
      const expected = <TestRunSummary> {todoCount: 0, todo: []};

      // act
      reporter.processTestResults([<TestReportNode>{resultType: "TODO"}], expected, []);

      // assert
      expect(expected.todoCount).to.equal(1);
    });

    it("should update the summary failures when results contains the todo result with labels", () => {
      // arrange
      const expected = <TestRunSummary> {todoCount: 0, todo: []};
      const result = <TestReportNode>{resultType: "TODO"};

      // act
      reporter.processTestResults([result], expected, ["foo"]);

      // assert
      expect(expected.todo).to.include.something.that.deep.equal({labels: ["foo"], result: result});
    });

    it("should update the summary with child results and the labels containing the parent", () => {
      // arrange
      const expected = <TestRunSummary> {failedCount: 0, failures: []};
      const childResult = <TestReportNode> {resultType: "FAILED"};
      const result = <TestReportSuiteNode>{label: "bar", results: [childResult]};

      // act
      reporter.processTestResults([result], expected, ["foo"]);

      // assert
      expect(expected.failures).to.include.something.that.deep.equal({labels: ["foo", "bar"], result: childResult});
    });
  });

  describe("toLoggedResult", () => {
    it("should return a result with an empty array of logMessages when no log messages are found", () => {
      // act
      const actual = reporter.toLoggedResult(<TestReportFailedLeaf> {});

      // assert
      expect(actual.logMessages).to.be.empty;
    });

    it("should return a result with the test log messages for the id", () => {
      // arrange
      reporter.testDebugLogMessages.push({id: 1, debugLogMessages: ["foo"]});
      reporter.testDebugLogMessages.push({id: 2, debugLogMessages: ["bar"]});
      reporter.testDebugLogMessages.push({id: 3, debugLogMessages: ["baz"]});

      // act
      const actual = reporter.toLoggedResult(<TestReportFailedLeaf> {id: 2});

      // assert
      expect(actual.logMessages).to.deep.equal(["bar"]);
    });

    it("should return a result with all the test log messages when the id is not unique", () => {
      // arrange
      reporter.testDebugLogMessages.push({id: 1, debugLogMessages: ["foo"]});
      reporter.testDebugLogMessages.push({id: 2, debugLogMessages: ["bar"]});
      reporter.testDebugLogMessages.push({id: 3, debugLogMessages: ["baz"]});
      reporter.testDebugLogMessages.push({id: 2, debugLogMessages: ["qux"]});

      // act
      const actual = reporter.toLoggedResult(<TestReportFailedLeaf> {id: 2});

      // assert
      expect(actual.logMessages).to.deep.equal(["bar", "qux"]);
    });
  });

  describe("toTestRunState", () => {
    it("should return exists as supplied exists value", () => {
      // act
      const actual = reporter.toTestRunState(false, true);

      // assert
      expect(actual.exists).to.be.true;
    });

    it("should return isFailOn as true when flag is true", () => {
      // act
      const actual = reporter.toTestRunState(true, false);

      // assert
      expect(actual.isFailOn).to.be.true;
    });

    it("should return isFailOn as false when flag is false", () => {
      // act
      const actual = reporter.toTestRunState(false, false);

      // assert
      expect(actual.isFailOn).to.be.false;
    });

    it("should return isFailOn as false when flag is undefined", () => {
      // act
      const actual = reporter.toTestRunState(undefined, false);

      // assert
      expect(actual.isFailOn).to.be.false;
    });

    it("should return isFailOn as true when exists and flag are true", () => {
      // act
      const actual = reporter.toTestRunState(true, true);

      // assert
      expect(actual.isFailure).to.be.true;
    });

    it("should return isFailOn as false when exists is false", () => {
      // act
      const actual = reporter.toTestRunState(true, false);

      // assert
      expect(actual.isFailure).to.be.false;
    });

    it("should return isFailOn as false when flag is false", () => {
      // act
      const actual = reporter.toTestRunState(false, true);

      // assert
      expect(actual.isFailure).to.be.false;
    });
  });

  describe("calculateOutcome", () => {
    it("should return outcome with 'PARTIAL' prefix for a non 'NORMAL' test run", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {failedCount: 1, runType: "FOCUS"}, <TestRunFailState> {});

      // assert
      expect(actual).to.match(/PARTIAL /);
    });

    it("should return outcome with 'FOCUSED' prefix for a 'NORMAL' test run with only count greater than zero", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {runType: "NORMAL", failedCount: 1, onlyCount: 1}, <TestRunFailState> {});

      // assert
      expect(actual).to.match(/FOCUSED /);
    });

    it("should return 'TEST RUN FAILED' for a 'NORMAL' test run when failedCount is greater than zero", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {runType: "NORMAL", failedCount: 1}, <TestRunFailState> {});

      // assert
      expect(actual).to.equal("TEST RUN FAILED");
    });

    it("should return 'TEST RUN FAILED' for a 'NORMAL' test run when failedCount is zero and only isFailure is true", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> { failedCount: 0, runType: "NORMAL" },
                                               <TestRunFailState> {only: {isFailure: true}, skip: {}, todo: {}});

      // assert
      expect(actual).to.equal("TEST RUN FAILED");
    });

    it("should return 'TEST RUN FAILED' for a 'NORMAL' test run when failedCount is zero and skip isFailure is true", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {failedCount: 0, runType: "NORMAL"}, <TestRunFailState> {
        only: {},
        skip: {isFailure: true},
        todo: {}
      });

      // assert
      expect(actual).to.equal("TEST RUN FAILED");
    });

    it("should return 'TEST RUN FAILED' for a 'NORMAL' test run when failedCount is zero and todo isFailure is true", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {failedCount: 0, runType: "NORMAL"}, <TestRunFailState> {
        only: {},
        skip: {},
        todo: {isFailure: true}
      });

      // assert
      expect(actual).to.equal("TEST RUN FAILED");
    });

    it("should return 'TEST RUN INCONCLUSIVE' for a 'NORMAL' test run when failedCount is zero and there is a skipped test", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {failedCount: 0, runType: "NORMAL"}, <TestRunFailState> {
        only: {},
        skip: {exists: true},
        todo: {}
      });

      // assert
      expect(actual).to.equal("TEST RUN INCONCLUSIVE");
    });

    it("should return 'TEST RUN INCONCLUSIVE' for a 'NORMAL' test run when failedCount is zero and there is a todo test", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {failedCount: 0, runType: "NORMAL"}, <TestRunFailState> {
        only: {},
        skip: {},
        todo: {exists: true}
      });

      // assert
      expect(actual).to.equal("TEST RUN INCONCLUSIVE");
    });

    it("should return 'TEST RUN PASSED' for a 'NORMAL' test run when failedCount is zero and all tests ran", () => {
      // act
      const actual = reporter.calculateOutcome(<TestRunSummary> {failedCount: 0, runType: "NORMAL"}, <TestRunFailState> {
        only: {},
        skip: {},
        todo: {}
      });

      // assert
      expect(actual).to.equal("TEST RUN PASSED");
    });
  });
});
