"use strict";

import * as chai from "chai";
import * as chalk from "chalk";
import * as sinon from "sinon";
import rewire = require("rewire");

import * as sinonChai from "sinon-chai";
import {createPlugin, DefaultReporterImp} from "../../../../plugin/default-reporter/reporter-plugin";
import {PluginReporter, ProgressReport, ResultType, RunArgs, TestRun, TestRunFailState, TestRunSummary} from "../../../../lib/plugin";
import {Compare} from "../../../../plugin/default-reporter/compare";
import {Util} from "../../../../lib/util";
import {ChalkChain} from "chalk";

let expect = chai.expect;
chai.use(sinonChai);

describe("plugin default-reporter reporter-plugin", () => {
  let RewiredPlugin = rewire("./../../../../plugin/default-reporter/reporter-plugin");
  let reporter: DefaultReporterImp;
  let mockCompare: Compare;
  let mockLogger: { log(message: string): void};
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
    let mockCompare = {};
    mockLogger = { log: sinon.spy() };
    let mockUtil = {padRight: x => x};
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
      revertChalk = RewiredPlugin.__set__({chalk: {bold: x => x, green: mockPassedStyle, red: mockFailedStyle, yellow: mockInconclusiveStyle}});
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
      let summary = <TestRunSummary> { passedCount: 123 };

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
      let failState = <TestRunFailState> { only: {exists: true} };

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
      let summary = <TestRunSummary> { passedCount: 123 };

      // act
      reporter.finish(<TestRun>{summary: summary});

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(summary, sinon.match.any);
    });

    it("should only log the summary header failState when quiet is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: false}});
      reporter.logSummary = sinon.spy();
      let summary = <TestRunSummary> { passedCount: 123 };
      let failState = <TestRunFailState> { only: {exists: true} };

      // act
      reporter.finish(<TestRun>{summary: summary, failState: failState});

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(sinon.match.any, failState);
    });

    it("should log the non passed info when quiet is false", () => {
      // arrange
      RewiredPlugin.__set__({program: {quiet: false}});
      reporter.logNonPassed = sinon.spy();
      let summary = <TestRunSummary> { passedCount: 123 };
      let failState = <TestRunFailState> { only: {exists: true} };

      // act
      reporter.finish(<TestRun>{summary: summary, failState: failState});

      // assert
      expect(reporter.logNonPassed).to.have.been.calledWith(summary);
    });
  });

  describe("logSummary", () => {
    let revertChalk: () => void;
    let mockFailedStyle: ChalkChain;
    let mockPassedStyle: ChalkChain;
    let mockInconclusiveStyle: ChalkChain;

    beforeEach(() => {
      let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
      mockFailedStyle = <ChalkChain><{}> sinon.spy();
      mockPassedStyle = <ChalkChain><{}> sinon.spy();
      mockInconclusiveStyle = <ChalkChain><{}> sinon.spy();
      revertChalk = RewiredPlugin.__set__({chalk: {bold: x => x, green: mockPassedStyle, red: mockFailedStyle, yellow: mockInconclusiveStyle}});
      reporter = new rewiredImp(mockCompare, mockLogger, mockUtil);
      reporter.init();
    });

    afterEach(() => {
      revertChalk();
    });

    it("should log the passed count with the passedStyle", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockPassedStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the passed count with 'Passed:' prefix", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockPassedStyle).to.have.been.calledWith(sinon.match(/Passed:/));
    });

    it("should log the passed count with prefix that is 10 char long", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{passedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockPassedStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });

    it("should log the failed count with the failedStyle", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{failedCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockFailedStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the failed count with 'Failed:' prefix", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

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
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 0}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).not.to.have.been.calledWith(sinon.match(/Todo:/));
    });

    it("should log the todo count with the todoStyle", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/123/));
    });

    it("should log the todo count with 'Todo:' prefix", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/Todo:/));
    });

    it("should log the todo count with prefix that is 10 char long", () => {
      // arrange
      reporter.paddedLog = sinon.spy();

      // act
      reporter.logSummary(<TestRunSummary>{todoCount: 123}, <TestRunFailState>{});

      // assert
      expect(mockInconclusiveStyle).to.have.been.calledWith(sinon.match(/^.{10}123$/));
    });
  });
});
