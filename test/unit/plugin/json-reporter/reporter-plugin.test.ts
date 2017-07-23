"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createPlugin, JsonReporter} from "../../../../plugin/json-reporter/reporter-plugin";
import {
  PluginReporter, ProgressReport, RunType, TestReportConfig, TestRun, TestRunSummary
} from "../../../../lib/plugin";
import {SinonStub} from "sinon";

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

  describe("toSummary", () => {
    it("should log the summary without runResults", () => {
      // act
      let actual = reporter.toSummary(<TestRunSummary> {outcome: "foo", runResults: []});

      // assert
      expect(actual).not.to.haveOwnProperty("runResults");
    });
  });

  describe("toFull", () => {
    it("should log the summary with runResults", () => {
      // act
      let actual = reporter.toFull(<TestRunSummary> {outcome: "foo", runResults: []});

      // assert
      expect(actual).to.haveOwnProperty("runResults");
    });
  });

  describe("toString", () => {

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
    it("should log the results as string when reportFile does not exist", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo"};
      let revert = RewiredReporter.__with__({program: {reportFile: undefined}});
      reporter.toString = Sinon.stub();
      (<SinonStub>reporter.toString).returns("bar");

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: expected}));

      // assert
      actual.then(() => {
        expect(mockLogger.log).to.have.been.calledWith("bar");
      });
    });

    it("should write the results to reportFile path when reportFile exists", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo"};
      let writeFile = Sinon.stub();
      writeFile.callsFake((filePath, data, callback) => callback());
      let revert = RewiredReporter.__with__({program: {reportFile: "bar"}, fs: {writeFile: writeFile}});
      reporter.toString = Sinon.stub();
      (<SinonStub>reporter.toString).returns("baz");

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: expected}));

      // assert
      actual.then(() => {
        expect(writeFile).to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should write the results to as string when reportFile exists", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo"};
      let writeFile = Sinon.stub();
      writeFile.callsFake((filePath, data, callback) => callback());
      let revert = RewiredReporter.__with__({program: {reportFile: "bar"}, fs: {writeFile: writeFile}});
      reporter.toString = Sinon.stub();
      (<SinonStub>reporter.toString).returns("baz");

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: expected}));

      // assert
      actual.then(() => {
        expect(writeFile).to.have.been.calledWith(Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should return a promise that calls reject when writeFile fails", () => {
      // arrange
      let expected = new Error("qux");
      let writeFile = Sinon.stub();
      writeFile.callsFake((filePath, data, callback) => callback(expected));
      let revert = RewiredReporter.__with__({program: {reportFile: "bar"}, fs: {writeFile: writeFile}});
      reporter.toString = Sinon.stub();
      (<SinonStub>reporter.toString).returns("baz");

      // act
      let actual: Bluebird<Object> = undefined;
      revert(() => actual = reporter.finish(<TestRun>{summary: {}}));

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });

  describe("toString", () => {
    it("should return the summary when program.quiet is true", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo"};
      let revert = RewiredReporter.__with__({program: {quiet: true}});
      reporter.toSummary = Sinon.stub();
      (<SinonStub>reporter.toSummary).returns(expected);

      // act
      let actual: string = undefined;
      revert(() => actual = reporter.toString(<TestRun>{}, false));

      // assert
      expect(actual).to.equal("{\"outcome\":\"foo\"}");
    });

    it("should return the full details when program.quiet is false", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo", runResults: []};
      let revert = RewiredReporter.__with__({program: {quiet: false, reportFile: "foo"}});
      reporter.toFull = Sinon.stub();
      (<SinonStub>reporter.toFull).returns(expected);

      // act
      let actual: string = undefined;
      revert(() => actual = reporter.toString(<TestRun>{}, false));

      // assert
      expect(actual).to.equal("{\"outcome\":\"foo\",\"runResults\":[]}");
    });

    it("should return indented string when prettyPrint is true", () => {
      // arrange
      let expected = <TestRunSummary> {outcome: "foo", runResults: []};
      let revert = RewiredReporter.__with__({program: {quiet: false, reportFile: "foo"}});
      reporter.toFull = Sinon.stub();
      (<SinonStub>reporter.toFull).returns(expected);

      // act
      let actual: string = undefined;
      revert(() => actual = reporter.toString(<TestRun>{}, true));

      // assert
      expect(actual).to.equal("{\n  \"outcome\": \"foo\",\n  \"runResults\": []\n}");
    });
  });
});
