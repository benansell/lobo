"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import * as Chalk from "chalk";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {createPlugin, DefaultReporterImp} from "../../../../plugin/default-reporter/reporter-plugin";
import {
  PluginReporter,
  ProgressReport,
  ResultType,
  RunArgs,
  TestReportFailedLeaf,
  TestReportSkippedLeaf,
  TestReportTodoLeaf, TestResultDecorator,
  TestRun,
  TestRunFailState,
  TestRunLeaf,
  TestRunSummary
} from "../../../../lib/plugin";
import {TestResultFormatter} from "../../../../lib/test-result-formatter";
import {Util} from "../../../../lib/util";
import {ChalkChain} from "chalk";

let expect = chai.expect;
chai.use(SinonChai);

describe("plugin default-reporter reporter-plugin", () => {
  let RewiredPlugin = rewire("../../../../plugin/default-reporter/reporter-plugin");
  let reporter: DefaultReporterImp;
  let mockDecorator: TestResultDecorator;
  let mockFormatter: TestResultFormatter;
  let mockLogger: { log(message: string): void };
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
    mockDecorator = <TestResultDecorator> {
      diff: x => x,
      failed: x => x,
      inconclusive: x => x,
      only: x => x,
      passed: x => x,
      skip: x => x,
      todo: x => x,
    };
    mockFormatter = <TestResultFormatter> {
      defaultIndentation: "",
      formatNotRun: Sinon.stub(),
      formatFailure: Sinon.stub(),
      formatUpdate: Sinon.stub()
    };
    mockLogger = {log: Sinon.spy()};
    mockUtil = <Util> {};
    mockUtil.padRight = x => x;
    reporter = new rewiredImp(mockLogger, mockDecorator, mockFormatter, mockUtil);
  });

  describe("createPlugin", () => {
    it("should return reporter", () => {
      // act
      let actual: PluginReporter = createPlugin();

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

  describe("init", () => {
    it("should do nothing", () => {
      // act
      expect(reporter.init()).not.to.throw;
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
      reporter.logNonPassed = Sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: summary}));

      // assert
      expect(reporter.logSummary).not.to.have.been.called;
      expect(reporter.logNonPassed).not.to.have.been.called;
      expect(reporter.logSummaryHeader).to.have.been.calledWith(summary, Sinon.match.any);
    });

    it("should only log the summary header failState when quiet is true", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {quiet: true}});
      reporter.logSummaryHeader = Sinon.spy();
      reporter.logSummary = Sinon.spy();
      reporter.logNonPassed = Sinon.spy();
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{failState: failState}));

      // assert
      expect(reporter.logSummary).not.to.have.been.called;
      expect(reporter.logNonPassed).not.to.have.been.called;
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

    it("should log the non passed info when quiet is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {quiet: false}});
      reporter.logNonPassed = Sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: summary, failState: failState}));

      // assert
      expect(reporter.logNonPassed).to.have.been.calledWith(summary);
    });

    it("should return a promise that calls reject when writeFile fails", () => {
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
    let revertChalk: () => void;
    let revertFramework: () => void;

    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      mockDecorator.failed = Sinon.spy();
      mockDecorator.inconclusive = Sinon.spy();
      mockDecorator.only = Sinon.spy();
      mockDecorator.passed = Sinon.spy();
      mockDecorator.skip = Sinon.spy();
      mockDecorator.todo = Sinon.spy();
      revertChalk = RewiredPlugin.__set__({Chalk: {bold: x => x}});
      reporter = new rewiredImp(mockLogger, mockDecorator, mockFormatter, mockUtil);
      reporter.init();
    });

    afterEach(() => {
      revertChalk();

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
    let revertChalk: () => void;
    
    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      mockDecorator.failed = Sinon.spy();
      mockDecorator.passed = Sinon.spy();
      mockDecorator.inconclusive = Sinon.spy();
      revertChalk = RewiredPlugin.__set__({
        Chalk: {
          bold: x => x,
          green: mockDecorator.passed,
          red: mockDecorator.failed,
          yellow: mockDecorator.inconclusive
        }
      });
      reporter = new rewiredImp(mockLogger, mockDecorator, mockFormatter, mockUtil);
      reporter.init();
    });

    afterEach(() => {
      revertChalk();
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

  describe("logNonPassed", () => {
    it("should log failed items", () => {
      // arrange
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportFailedLeaf>> {labels: [], result: {label: "foo"}};

      // act
      reporter.logNonPassed(<TestRunSummary>{failures: [expected]});

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should not log skipped items when showSkip is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: false}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{labels: [], result: {label: "foo"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logFailureMessage).not.to.have.been.called;
    });

    it("should log skipped items as failure when showSkip is true and resultType is not 'SKIPPED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: true}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{labels: [], result: {label: "foo", resultType: "IGNORED"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should log skipped items as not run when showSkip is true and resultType is 'SKIPPED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: true}});
      reporter.logNotRunMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{labels: [], result: {label: "foo", resultType: "SKIPPED"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logNotRunMessage).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should not log todo items when showTodo is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: false}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{labels: [], result: {label: "foo"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{failures: [], todo: [expected]}));

      // assert
      expect(reporter.logFailureMessage).not.to.have.been.called;
    });

    it("should log todo items as failure when showTodo is true and resultType is not 'TODO'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: true}});
      reporter.logFailureMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{labels: [], result: {label: "foo", resultType: "IGNORED"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{failures: [], todo: [expected]}));

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should log todo items as not run when showTodo is true and resultType is 'TODO'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: true}});
      reporter.logNotRunMessage = Sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{labels: [], result: {label: "foo", resultType: "TODO"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{failures: [], todo: [expected]}));

      // assert
      expect(reporter.logNotRunMessage).to.have.been.calledWith(expected, Sinon.match.any);
    });
  });

  describe("logLabels", () => {
    let revertLabelStyle: () => void;

    beforeEach(() => {
      revertLabelStyle = RewiredPlugin.__set__({Chalk: {dim: x => x}});
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      reporter = new rewiredImp(mockFormatter, mockLogger, mockUtil);
    });

    afterEach(() => {
      revertLabelStyle();
    });

    it("should not pad top label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> Sinon.stub();
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith("foo");
    });

    it("should pad child label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> Sinon.stub();
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(" bar");
    });

    it("should not log labels that are in the context", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> Sinon.stub();
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, ["foo"], mockStyle);

      // assert
      expect(reporter.paddedLog).not.to.have.been.calledWith("foo");
    });

    it("should pad item label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> (x => x);
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(Sinon.match(/[ ]{4}.*baz/));
    });

    it("should add number prefix to item label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> (x => x);
      reporter.paddedLog = Sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 123, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(Sinon.match(/.*123\) baz/));
    });
  });

  describe("logFailureMessage", () => {
    it("should log the message returned by formatFailure", () => {
      // arrange
      (<SinonStub>mockFormatter.formatFailure).returns("bar");

      // act
      reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {labels: [], result: {label: "foo"}}, "?");

      // assert
      expect(mockLogger.log).to.have.been.calledWith("bar");
    });
  });

  describe("logNotRunMessage", () => {
    it("should log the message returned by formatNotRun", () => {
      // arrange
      (<SinonStub>mockFormatter.formatNotRun).returns("bar");

      // act
      reporter.logNotRunMessage(<TestRunLeaf<TestReportSkippedLeaf>> {result: {reason: "foo"}}, "?");

      // assert
      expect(mockLogger.log).to.have.been.calledWith("bar");
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
      mockFormatter.defaultIndentation = "  ";

      // act
      reporter.paddedLog("foo");

      // assert
      expect(mockLogger.log).to.have.been.calledWith("  foo");
    });
  });
});
