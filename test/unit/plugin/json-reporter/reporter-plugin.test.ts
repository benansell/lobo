"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createPlugin, JsonReporter} from "../../../../plugin/json-reporter/reporter-plugin";
import {
  PluginReporter, ProgressReport, RunType, TestReportConfig, TestRun, TestRunSummary
} from "../../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("plugin json-reporter reporter-plugin", () => {
  let RewiredReporter = rewire("../../../../plugin/json-reporter/reporter-plugin");
  let reporter: JsonReporter;
  let mockLogger: { log(message: string): void };

  beforeEach(() => {
    let rewiredImp = RewiredReporter.__get__("JsonReporter");
    mockLogger = {log: Sinon.spy()};
    reporter = new rewiredImp(mockLogger);
  });

  describe("createPlugin", () => {
    it("should return reporter", () => {
      // act
      let actual: PluginReporter = createPlugin();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("toCommonOutput", () => {
    it("should return object with 'config' set to supplied value", () => {
      // arrange
      let expected = <TestReportConfig> {framework: "foo"};

      // act
      let actual = <{ config: TestReportConfig }> JsonReporter.toCommonOutput(<TestRunSummary> {config: expected});

      // assert
      expect(actual.config).to.equal(expected);
    });

    it("should return object with 'durationMilliseconds' set to supplied value", () => {
      // arrange
      let expected = 123;

      // act
      let actual = <{ durationMilliseconds: number }> JsonReporter.toCommonOutput(<TestRunSummary> {durationMilliseconds: expected});

      // assert
      expect(actual.durationMilliseconds).to.equal(expected);
    });

    it("should return object with 'endDateTime' set to supplied value", () => {
      // arrange
      let expected = new Date();

      // act
      let actual = <{ endDateTime: Date }> JsonReporter.toCommonOutput(<TestRunSummary> {endDateTime: expected});

      // assert
      expect(actual.endDateTime).to.equal(expected);
    });

    it("should return object with 'failedCount' set to supplied value", () => {
      // arrange
      let expected = 123;

      // act
      let actual = <{ failedCount: number }> JsonReporter.toCommonOutput(<TestRunSummary> {failedCount: expected});

      // assert
      expect(actual.failedCount).to.equal(expected);
    });

    it("should return object with 'onlyCount' set to supplied value", () => {
      // arrange
      let expected = 123;

      // act
      let actual = <{ onlyCount: number }> JsonReporter.toCommonOutput(<TestRunSummary> {onlyCount: expected});

      // assert
      expect(actual.onlyCount).to.equal(expected);
    });

    it("should return object with 'outcome' set to supplied value", () => {
      // arrange
      let expected = "foo";

      // act
      let actual = <{ outcome: string }> JsonReporter.toCommonOutput(<TestRunSummary> {outcome: expected});

      // assert
      expect(actual.outcome).to.equal(expected);
    });

    it("should return object with 'passedCount' set to supplied value", () => {
      // arrange
      let expected = 123;

      // act
      let actual = <{ passedCount: number }> JsonReporter.toCommonOutput(<TestRunSummary> {passedCount: expected});

      // assert
      expect(actual.passedCount).to.equal(expected);
    });

    it("should return object with 'runType' set to supplied value", () => {
      // arrange
      let expected = "FOCUS";

      // act
      let actual = <{ runType: RunType }> JsonReporter.toCommonOutput(<TestRunSummary> {runType: expected});

      // assert
      expect(actual.runType).to.equal(expected);
    });

    it("should return object with 'skippedCount' set to supplied value", () => {
      // arrange
      let expected = 123;

      // act
      let actual = <{ skippedCount: number }> JsonReporter.toCommonOutput(<TestRunSummary> {skippedCount: expected});

      // assert
      expect(actual.skippedCount).to.equal(expected);
    });

    it("should return object with 'startDateTime' set to supplied value", () => {
      // arrange
      let expected = new Date();

      // act
      let actual = <{ startDateTime: Date }> JsonReporter.toCommonOutput(<TestRunSummary> {startDateTime: expected});

      // assert
      expect(actual.startDateTime).to.equal(expected);
    });

    it("should return object with 'success' set to supplied value", () => {
      // arrange
      let expected = true;

      // act
      let actual = <{ success: boolean }> JsonReporter.toCommonOutput(<TestRunSummary> {success: expected});

      // assert
      expect(actual.success).to.equal(expected);
    });

    it("should return object with 'todoCount' set to supplied value", () => {
      // arrange
      let expected = 123;

      // act
      let actual = <{ todoCount: number }> JsonReporter.toCommonOutput(<TestRunSummary> {todoCount: expected});

      // assert
      expect(actual.todoCount).to.equal(expected);
    });
  });

  describe("logSummary", () => {
    it("should log the summary without runResults", () => {
      // act
      reporter.logSummary(<TestRunSummary> {outcome: "foo", runResults: []});

      // assert
      expect(mockLogger.log).to.have.been.calledWith("{\"outcome\":\"foo\"}");
    });
  });

  describe("logFull", () => {
    it("should log the summary with runResults", () => {
      // act
      reporter.logFull(<TestRunSummary> {outcome: "foo", runResults: []});

      // assert
      expect(mockLogger.log).to.have.been.calledWith("{\"outcome\":\"foo\",\"runResults\":[]}");
    });
  });

  describe("runArgs", () => {
    it("should do nothing", () => {
      // act
      expect(reporter.runArgs()).not.to.throw;
    });
  });

  describe("init", () => {
    it("should do nothing", () => {
      // act
      expect(reporter.init()).not.to.throw;
    });
  });

  describe("update", () => {
    it("should log stringified result to console", () => {
      // arrange
      let expected = <ProgressReport> {label: "foo"};

      // act
      reporter.update(expected);

      // assert
      expect(mockLogger.log).to.have.been.calledWith("{\"label\":\"foo\"}");
    });
  });

  describe("finish", () => {
    it("should log the summary when program.quiet is true", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo"};
      RewiredReporter.__set__({program: {quiet: true}});
      reporter.logSummary = Sinon.spy();

      // act
      reporter.finish(<TestRun>{summary: expected});

      // assert
      expect(reporter.logSummary).to.have.been.calledWith(expected);
    });

    it("should log the full details when program.quiet is false", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo"};
      RewiredReporter.__set__({program: {quiet: false}});
      reporter.logFull = Sinon.spy();

      // act
      reporter.finish(<TestRun>{summary: expected});

      // assert
      expect(reporter.logFull).to.have.been.calledWith(expected);
    });
  });
});
