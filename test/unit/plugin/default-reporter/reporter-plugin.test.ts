"use strict";

import * as chai from "chai";
import * as chalk from "chalk";
import * as sinon from "sinon";
import rewire = require("rewire");

import * as sinonChai from "sinon-chai";
import {createPlugin, DefaultReporterImp} from "../../../../plugin/default-reporter/reporter-plugin";
import {
  FailureMessage,
  PluginReporter, ProgressReport, ResultType, RunArgs, TestReportFailedLeaf, TestReportSkippedLeaf, TestReportTodoLeaf, TestRun,
  TestRunFailState, TestRunLeaf,
  TestRunSummary
} from "../../../../lib/plugin";
import {Compare} from "../../../../plugin/default-reporter/compare";
import {Util} from "../../../../lib/util";
import {ChalkChain} from "chalk";

let expect = chai.expect;
chai.use(sinonChai);

describe("plugin default-reporter reporter-plugin", () => {
  let RewiredPlugin = rewire("../../../../plugin/default-reporter/reporter-plugin");
  let reporter: DefaultReporterImp;
  let mockCompare: Compare;
  let mockLogger: { log(message: string): void };
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
    mockCompare = <Compare> { diff: sinon.stub() };
    mockLogger = {log: sinon.spy()};
    mockUtil = <Util> {};
    mockUtil.padRight = x => x;
    reporter = new rewiredImp(mockCompare, mockLogger, mockUtil);
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
      reporter.paddedLog = sinon.spy();

      // act
      reporter.runArgs(expected);
      reporter.logSummary(<TestRunSummary>{}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith("runCount: 123");
    });
  });

  describe("init", () => {
    let revertChalk: () => void;
    let mockFailedStyle: ChalkChain;
    let mockPassedStyle: ChalkChain;
    let mockInconclusiveStyle: ChalkChain;

    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      mockFailedStyle = <ChalkChain><{}> sinon.spy();
      mockPassedStyle = <ChalkChain><{}> sinon.spy();
      mockInconclusiveStyle = <ChalkChain><{}> sinon.spy();
      revertChalk = RewiredPlugin.__set__({
        chalk: {
          bold: x => x,
          green: mockPassedStyle,
          red: mockFailedStyle,
          yellow: mockInconclusiveStyle
        }
      });
      reporter = new rewiredImp(mockCompare, mockLogger, mockUtil);
    });

    afterEach(() => {
      revertChalk();
    });

    it("should set onlyStyle to failedStyle when failOnOnly is true", () => {
      // arrange
      RewiredPlugin.__set__({program: {framework: "elm-test-extra", failOnOnly: true}});
      reporter.paddedLog = sinon.spy();

      // act
      reporter.init();
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("Ignored:  123");
    });

    it("should set onlyStyle to inconclusiveStyle when failOnOnly is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {framework: "elm-test-extra", failOnOnly: false}});
      reporter.paddedLog = sinon.spy();

      // act
      reporter.init();
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith("Ignored:  123");
    });

    it("should set skipStyle to failedStyle when failOnSkip is true", () => {
      // arrange
      RewiredPlugin.__set__({program: {framework: "elm-test-extra", failOnSkip: true}});
      reporter.paddedLog = sinon.spy();

      // act
      reporter.init();
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("Skipped:  123");
    });

    it("should set skipStyle to inconclusiveStyle when failOnSkip is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {framework: "elm-test-extra", failOnSkip: false}});
      reporter.paddedLog = sinon.spy();

      // act
      reporter.init();
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith("Skipped:  123");
    });

    it("should set todoStyle to failedStyle when failOnTodo is true", () => {
      // arrange
      RewiredPlugin.__set__({program: {framework: "elm-test-extra", failOnTodo: true}});
      reporter.paddedLog = sinon.spy();

      // act
      reporter.init();
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("Todo:     123");
    });

    it("should set todoStyle to inconclusiveStyle when failOnTodo is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {framework: "elm-test-extra", failOnTodo: false}});
      reporter.paddedLog = sinon.spy();

      // act
      reporter.init();
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith("Todo:     123");
    });
  });

  describe("update", () => {
    let original;
    let output;

    function write(str): boolean {
      output += str;

      return true;
    }

    beforeEach(() => {
      output = "";
      original = process.stdout.write;
      process.stdout.write = write;

      reporter.init();
    });

    afterEach(() => {
      process.stdout.write = original;
    });

    it("should report '.' when a test has 'PASSED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "PASSED"});

      // assert
      expect(output).to.equal(".");
    });

    it("should report '!' when a test has 'FAILED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "FAILED"});

      // assert
      expect(output).to.equal(chalk.red("!"));
    });

    it("should report '?' when a test has 'SKIPPED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "SKIPPED"});

      // assert
      expect(output).to.equal(chalk.yellow("?"));
    });

    it("should report '-' when a test has 'SKIPPED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "TODO"});

      // assert
      expect(output).to.equal(chalk.yellow("-"));
    });

    it("should report ' ' when reportProgress is undefined", () => {
      // act
      reporter.update(undefined);

      // assert
      expect(output).to.equal(" ");
    });

    it("should report ' ' when a test has unknown resultType", () => {
      // act
      reporter.update(<ProgressReport>{resultType: <ResultType>"foo bar"});

      // assert
      expect(output).to.equal(" ");
    });
  });

  describe("finish", () => {
    it("should only log the summary header info when quiet is true", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: true}});
      reporter.logSummaryHeader = sinon.spy();
      reporter.logSummary = sinon.spy();
      reporter.logNonPassed = sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};

      // act
      reporter.finish(<TestRun>{summary: summary});

      // assert
      expect(reporter.logSummary).not.to.have.been.called;
      expect(reporter.logNonPassed).not.to.have.been.called;
      expect(reporter.logSummaryHeader).to.have.been.calledWith(summary, sinon.match.any);
    });

    it("should only log the summary header failState when quiet is true", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: true}});
      reporter.logSummaryHeader = sinon.spy();
      reporter.logSummary = sinon.spy();
      reporter.logNonPassed = sinon.spy();
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      reporter.finish(<TestRun>{failState: failState});

      // assert
      expect(reporter.logSummary).not.to.have.been.called;
      expect(reporter.logNonPassed).not.to.have.been.called;
      expect(reporter.logSummaryHeader).to.have.been.calledWith(sinon.match.any, failState);
    });

    it("should log the full summary info when quiet is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: false}});
      reporter.logSummary = sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};

      // act
      reporter.finish(<TestRun>{summary: summary});

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(summary, sinon.match.any);
    });

    it("should only log the summary header failState when quiet is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: false}});
      reporter.logSummary = sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      reporter.finish(<TestRun>{summary: summary, failState: failState});

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(sinon.match.any, failState);
    });

    it("should log the non passed info when quiet is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: false}});
      reporter.logNonPassed = sinon.spy();
      let summary = <TestRunSummary> {passedCount: 123};
      let failState = <TestRunFailState> {only: {exists: true}};

      // act
      reporter.finish(<TestRun>{summary: summary, failState: failState});

      // assert
      expect(reporter.logNonPassed).to.have.been.calledWith(summary);
    });
  });

  describe("logSummary", () => {
    let revertChalk: () => void;
    let revertFramework: () => void;
    let mockFailedStyle: ChalkChain;
    let mockPassedStyle: ChalkChain;
    let mockInconclusiveStyle: ChalkChain;

    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      mockFailedStyle = <ChalkChain><{}> sinon.spy();
      mockPassedStyle = <ChalkChain><{}> sinon.spy();
      mockInconclusiveStyle = <ChalkChain><{}> sinon.spy();
      revertChalk = RewiredPlugin.__set__({
        chalk: {
          bold: x => x,
          green: mockPassedStyle,
          red: mockFailedStyle,
          yellow: mockInconclusiveStyle
        }
      });
      reporter = new rewiredImp(mockCompare, mockLogger, mockUtil);
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
      expect(mockPassedStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the passed count with 'Passed:' prefix", () => {
      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockPassedStyle).to.have.been.calledWith(sinon.match(/Passed:/));
    });

    it("should log the passed count with prefix that is 10 char long", () => {
      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockPassedStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });

    it("should log the failed count with the failedStyle", () => {
      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the failed count with 'Failed:' prefix", () => {
      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith(sinon.match(/Failed:/));
    });

    it("should log the failed count with prefix that is 10 char long", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });

    it("should not log the todo count when it is zero", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Todo:/));
    });

    it("should log the todo count with the todoStyle", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the todo count with 'Todo:' prefix", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/Todo:/));
    });

    it("should log the todo count with prefix that is 10 char long", () => {
      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });

    it("should not log the skipped count when it is non-zero and framework is 'elm-test'", () => {
      // arrange
      revertFramework = RewiredPlugin.__set__({program: {framework: 'elm-test'}});

      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Skipped:/));
    });

    it("should not log the skipped count when it is zero and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Skipped:/));
    });

    it("should log the skipped count with the skippedStyle and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the skipped count with 'Skipped:' prefix and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/Skipped:/));
    });

    it("should log the skipped count with prefix that is 10 char long and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{skippedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });

    it("should not log the only count when it is non-zero and framework is 'elm-test'", () => {
      // arrange
      revertFramework = RewiredPlugin.__set__({program: {framework: 'elm-test'}});

      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Ignored:/));
    });

    it("should not log the only count when it is zero and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Ignored:/));
    });

    it("should log the only count with the onlyStyle and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the only count with 'Ignored:' prefix and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/Ignored:/));
    });

    it("should log the only count with prefix that is 10 char long and framework is not 'elm-test'", () => {
      // act
      reporter.logSummary(<TestRunSummary>{onlyCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });

    it("should not log the duration when it is undefined", () => {
      // act
      reporter.logSummary(<TestRunSummary>{durationMilliseconds: undefined}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Duration:/));
    });

    it("should log the duration with 'Duration:' prefix", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{durationMilliseconds: 123}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(sinon.match(/Duration:/));
    });

    it("should log the duration with value and 'ms' suffix", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{durationMilliseconds: 123}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(sinon.match(/123ms/));
    });

    it("should log the initArgs", () => {
      // arrange
      reporter.paddedLog = sinon.spy();
      reporter.runArgs(<RunArgs> {runCount: 123});

      // act
      reporter.logSummary(<TestRunSummary>{}, <TestRunFailState>{});

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(sinon.match(/runCount: 123/));
    });
  });

  describe("logSummaryHeader", () => {
    let revertChalk: () => void;
    let mockFailedStyle: ChalkChain;
    let mockPassedStyle: ChalkChain;
    let mockInconclusiveStyle: ChalkChain;

    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      mockFailedStyle = <ChalkChain><{}> sinon.spy();
      mockPassedStyle = <ChalkChain><{}> sinon.spy();
      mockInconclusiveStyle = <ChalkChain><{}> sinon.spy();
      revertChalk = RewiredPlugin.__set__({
        chalk: {
          bold: x => x,
          green: mockPassedStyle,
          red: mockFailedStyle,
          yellow: mockInconclusiveStyle
        }
      });
      reporter = new rewiredImp(mockCompare, mockLogger, mockUtil);
      reporter.init();
    });

    afterEach(() => {
      revertChalk();
    });

    it("should use an outcomeStyle of failed when the failed count is non-zero", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{failedCount: 123, outcome: "foo"}, <TestRunFailState> {});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.only does not exist", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: undefined, skip: {}, todo: {}});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.skip does not exist", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: undefined, todo: {}});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.todo does not exist", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: undefined});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.only is a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {isFailure: true}, skip: {}, todo: {}});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.skip is a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {isFailure: true}, todo: {}});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of failed when failState.todo is a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: {isFailure: true}});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of inconclusive when failState.skip.exists is true", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {exists: true}, todo: {}});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of inconclusive when failState.todo.exists is true", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: {exists: true}});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith("foo");
    });

    it("should use an outcomeStyle of passed when everything has run and not a failure", () => {
      // act
      reporter.logSummaryHeader(<TestRunSummary>{outcome: "foo"}, <TestRunFailState> {only: {}, skip: {}, todo: {}});

      // assert
      expect(mockPassedStyle).to.have.been.calledWith("foo");
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
      reporter.logFailureMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportFailedLeaf>>{ labels: [], result: {label: "foo"}};

      // act
      reporter.logNonPassed(<TestRunSummary>{ failures: [expected]});

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected, sinon.match.any);
    });

    it("should not log skipped items when showSkip is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: false}});
      reporter.logFailureMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{ labels: [], result: {label: "foo"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{ failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logFailureMessage).not.to.have.been.called;
    });

    it("should log skipped items as failure when showSkip is true and resultType is not 'SKIPPED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: true}});
      reporter.logFailureMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{ labels: [], result: {label: "foo", resultType: "IGNORED"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{ failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected, sinon.match.any);
    });

    it("should log skipped items as not run when showSkip is true and resultType is 'SKIPPED'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showSkip: true}});
      reporter.logNotRunMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportSkippedLeaf>>{ labels: [], result: {label: "foo", resultType: "SKIPPED"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{ failures: [], skipped: [expected]}));

      // assert
      expect(reporter.logNotRunMessage).to.have.been.calledWith(expected, sinon.match.any);
    });

    it("should not log todo items when showTodo is false", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: false}});
      reporter.logFailureMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{ labels: [], result: {label: "foo"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{ failures: [], todo: [expected]}));

      // assert
      expect(reporter.logFailureMessage).not.to.have.been.called;
    });

    it("should log todo items as failure when showTodo is true and resultType is not 'TODO'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: true}});
      reporter.logFailureMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{ labels: [], result: {label: "foo", resultType: "IGNORED"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{ failures: [], todo: [expected]}));

      // assert
      expect(reporter.logFailureMessage).to.have.been.calledWith(expected, sinon.match.any);
    });

    it("should log todo items as not run when showTodo is true and resultType is 'TODO'", () => {
      // arrange
      let revert = RewiredPlugin.__with__({program: {showTodo: true}});
      reporter.logNotRunMessage = sinon.spy();
      let expected = <TestRunLeaf<TestReportTodoLeaf>>{ labels: [], result: {label: "foo", resultType: "TODO"}};

      // act
      revert(() => reporter.logNonPassed(<TestRunSummary>{ failures: [], todo: [expected]}));

      // assert
      expect(reporter.logNotRunMessage).to.have.been.calledWith(expected, sinon.match.any);
    });
  });

  describe("logLabels", () => {
    let revertLabelStyle: () => void;

    beforeEach(() => {
      revertLabelStyle = RewiredPlugin.__set__({chalk: {dim: x => x}});
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      reporter = new rewiredImp(mockCompare, mockLogger, mockUtil);
    });

    afterEach(() => {
      revertLabelStyle();
    });

    it("should not pad top label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> sinon.stub();
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith("foo");
    });

    it("should pad child label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> sinon.stub();
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(" bar");
    });

    it("should not log labels that are in the context", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> sinon.stub();
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, ["foo"], mockStyle);

      // assert
      expect(reporter.paddedLog).not.to.have.been.calledWith("foo");
    });

    it("should pad item label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> (x => x);
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 1, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(sinon.match(/[ ]{4}.*baz/));
    });

    it("should add number prefix to item label", () => {
      // arrange
      let mockStyle = <ChalkChain><{}> (x => x);
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logLabels(["foo", "bar"], "baz", 123, [], mockStyle);

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith(sinon.match(/.*123\) baz/));
    });
  });

  describe("logFailureMessage", () => {
    it("should call formatFailure for supplied failure message", () => {
      // arrange
      let expected = <FailureMessage>{message: ""};
      reporter.formatFailure = sinon.spy();

      // act
      reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {result: {resultMessages: [expected]}}, "?");

      // assert
      expect(reporter.formatFailure).to.have.been.calledWith(expected.message, sinon.match.any);
    });

    it("should call formatFailure with default of 80 columns when stdout is undefined", () => {
      // arrange
      let revert = RewiredPlugin.__with__({process: {stdout: undefined}});
      let expected = <FailureMessage>{message: ""};
      reporter.formatFailure = sinon.spy();

      // act
      revert(() => reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {result: {resultMessages: [expected]}}, "?"));

      // assert
      expect(reporter.formatFailure).to.have.been.calledWith(sinon.match.any, 80);
    });

    it("should call formatFailure with default of 80 columns when stdout.columns is undefined", () => {
      // arrange
      let revert = RewiredPlugin.__with__({process: {stdout: {columns: undefined}}});
      let expected = <FailureMessage>{message: ""};
      reporter.formatFailure = sinon.spy();

      // act
      revert(() => reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {result: {resultMessages: [expected]}}, "?"));

      // assert
      expect(reporter.formatFailure).to.have.been.calledWith(sinon.match.any, 80);
    });

    it("should call formatFailure with std.columns minus padding length when stdout.columns exists", () => {
      // arrange
      let revert = RewiredPlugin.__with__({process: {stdout: {columns: 10}}});
      let expected = <FailureMessage>{message: ""};
      reporter.formatFailure = sinon.spy();

      // act
      revert(() => reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {result: {resultMessages: [expected]}}, "?"));

      // assert
      expect(reporter.formatFailure).to.have.been.calledWith(sinon.match.any, 9);
    });

    it("should log the formatted failure message from the supplied failure", () => {
      // arrange
      let expected = <FailureMessage>{message: "foo"};
      reporter.formatFailure = x => x;
      reporter.formatMessage = (message, padding) => message;

      // act
      reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {result: {resultMessages: [expected]}}, "?");

      // assert
      expect(mockLogger.log).to.have.been.calledWith(expected.message);
    });

    it("should log the failure given from the supplied failure with padding of 2", () => {
      // arrange
      let expected = <FailureMessage>{given: "foo", message: ""};
      reporter.formatMessage = (x, y) => x;

      // act
      reporter.logFailureMessage(<TestRunLeaf<TestReportFailedLeaf>> {result: {resultMessages: [expected]}}, "?");

      // assert
      expect(mockLogger.log).to.have.been.calledWith("  " + expected.given);
    });
  });

  describe("logNotRunMessage", () => {
    it("should log the reason padded by the supplied value", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logNotRunMessage(<TestRunLeaf<TestReportSkippedLeaf>> { result: { reason: "foo"}}, "?");

      // assert
      expect(reporter.paddedLog).to.have.been.calledWith("?foo");
    });
  });

  describe("formatFailure", () => {
    let revertChalk: () => void;
    let mockYellow: sinon.SinonStub;

    beforeEach(() => {
      mockYellow = sinon.stub();
      mockYellow.callsFake(x => x);
      revertChalk = RewiredPlugin.__set__({chalk: {yellow: mockYellow}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should style the whole message as yellow when there are no '│'", () => {
      // act
      reporter.formatFailure("foo\n bar\n baz\n", 123);

      // assert
      expect(mockYellow).to.have.been.calledWith("foo\n bar\n baz\n");
    });

    it("should not style the message as yellow when there an unexpected number of lines", () => {
      // act
      reporter.formatFailure("foo\n│ bar\n", 123);

      // assert
      expect(mockYellow).not.to.have.been.called;
    });

    it("should return the message unaltered when there an unexpected number of lines", () => {
      // arrange
      let expected = "foo\n│ bar\n";

      // act
      let actual = reporter.formatFailure(expected, 123);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should style the failure message as yellow when there are '│'", () => {
      // act
      reporter.formatFailure("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(mockYellow).to.have.been.calledWith("bar");
    });

    it("should not replace failure markers when '│ ' is missing", () => {
      // act
      let actual = reporter.formatFailure("foo\n╷\n│bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("foo\n╷\n│bar\n╵\nbaz");
    });

    it("should replace failure markers '╷', │' and '╵' with '┌','│' and'└' ", () => {
      // act
      let actual = reporter.formatFailure("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("┌ foo\n│\n│ bar\n│\n└ baz");
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equal'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalDicts'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalDicts'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo","│","│ Expect.equalDicts bar","│","└ baz"], sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalLists'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalLists'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo","│","│ Expect.equalLists bar","│","└ baz"], sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalSets'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalSets'", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo","│","│ Expect.equalSets bar","│","└ baz"], sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with message as lines", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo","│","│ Expect.equal bar","│","└ baz"], sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with supplied maxLength", () => {
      // arrange
      reporter.formatExpectEqualFailure = sinon.stub();
      (<sinon.SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(sinon.match.any, 123);
    });
  });

  describe("formatExpectEqualFailure", () => {
    let revertChalk: () => void;

    beforeEach(() => {
      revertChalk = RewiredPlugin.__set__({chalk: {red: x => x}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should return lines with left diff hint from compare.diff added", () => {
      // arrange
      (<sinon.SinonStub> mockCompare.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ foo","│","│ Expect.equal bar","│","└ baz"], 123);

      // assert
      expect(actual).to.include("│ ^^^");
    });

    it("should return lines with right diff hint from compare.diff added", () => {
      // arrange
      (<sinon.SinonStub> mockCompare.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ foo","│","│ Expect.equal bar","│","└ baz"], 123);

      // assert
      expect(actual).to.include("  ^^^");
    });

    it("should return lines without splitting when length is under maxLength", () => {
      // arrange
      (<sinon.SinonStub> mockCompare.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ foo","│","│ bar","│","└ baz"], 6);

      // assert
      expect(actual.length).to.equal(8);
      expect(actual[0]).to.equal("┌ foo");
      expect(actual[1]).to.equal("│ ^^^");
      expect(actual[2]).to.equal("");
      expect(actual[3]).to.equal("│ bar");
      expect(actual[4]).to.equal("│");
      expect(actual[5]).to.equal("└ baz");
      expect(actual[6]).to.equal("  ^^^");
      expect(actual[7]).to.equal("");
    });

    it("should return split lines when length is over max length", () => {
      // arrange
      (<sinon.SinonStub> mockCompare.diff).returns({left: "^^^^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ fooabc","│","│ bar","│","└ baz"], 6);

      // assert
      expect(actual.length).to.equal(10);
      expect(actual[0]).to.equal("┌ foo");
      expect(actual[1]).to.equal("│ ^^^");
      expect(actual[2]).to.equal("│ abc");
      expect(actual[3]).to.equal("│ ^^^");
      expect(actual[4]).to.equal("");
      expect(actual[5]).to.equal("│ bar");
      expect(actual[6]).to.equal("│");
      expect(actual[7]).to.equal("└ baz");
      expect(actual[8]).to.equal("  ^^^");
      expect(actual[9]).to.equal("");
    });
  });

  describe("chunkLine", () => {
    let revertChalk: () => void;
    let mockRed;

    beforeEach(() => {
      mockRed = sinon.stub();
      revertChalk = RewiredPlugin.__set__({chalk: {red: mockRed}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should highlight diff with red style", () => {
      // act
      reporter.chunkLine("foo", " ^^^", 10, "x", "y");

      // assert
      expect(mockRed).to.have.been.calledWith("^^^");
    });
  });

  describe("formatMessage", () => {
    it("should return empty string when message is undefined", () => {
      // act
      let actual = reporter.formatMessage(undefined, "?");

      // assert
      expect(actual).to.equal("");
    });

    it("should return string with specified padding value added on each line", () => {
      // act
      let actual = reporter.formatMessage("foo\nbar", "??");

      // assert
      expect(actual).to.equal("??foo\n??bar");
    });
  });

  describe("paddedLog", () => {
    it("should log undefined as empty string", () => {
      // act
      reporter.paddedLog(undefined);

      // assert
      expect(mockLogger.log).to.have.been.calledWith("");
    });

    it("should log message with padding of 2", () => {
      // act
      reporter.paddedLog("foo");

      // assert
      expect(mockLogger.log).to.have.been.calledWith("  foo");
    });
  });
});
