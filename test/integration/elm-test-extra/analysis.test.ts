"use strict";

import * as chai from "chai";
import {TestRunner} from "../lib/test-runner";
import reporterExpect from "../lib/default-reporter-expect";
import {Util} from "../lib/util";

let expect = chai.expect;

describe("elm-test-extra-analysis", () => {
  let runner: TestRunner;
  let testContext: string[];
  let util: Util;

  before(() => {
    runner = new TestRunner();
    util = new Util();
    testContext = util.initializeTestContext(__dirname);
    util.cd(__dirname);
    runner.clean();
  });

  beforeEach(() => {
    runner.cleanLoboAndBuildArtifacts();
  });

  describe("custom-test-file", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/custom-test-file");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("duplicate-name", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/duplicate-name");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("empty-suite", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/empty-suite");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(0, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("hidden", () => {
    it("should fail analysis and report", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/hidden");

      // assert
      reporterExpect(result).analysisSummary(1, 0);
      reporterExpect(result).analysisHidden();
      expect(result.code).to.equal(1);

      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);
      expect(failureMessage).to.match(/hiddenTest \(tests[\\/]analysis[\\/]hidden[\\/]Tests\.elm:14:1\)/);
    });
  });

  describe("ignore-test-helper", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/ignore-test-helper");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(2, 1);
      expect(result.code).to.equal(1);
    });
  });

  describe("over-exposed", () => {
    it("should fail analysis and report", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/over-exposed");

      // assert
      reporterExpect(result).analysisSummary(0, 3);
      reporterExpect(result).analysisOverExposed();
      expect(result.code).to.equal(1);

      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);
      expect(failureMessage).to.match(/1\) (.\[\d\dm)?suiteTwo \(Tests\.elm:15:1\)/g);
      expect(failureMessage).to.match(/all \(Tests\.elm:7:1\)/);
      expect(failureMessage).to.match(/2\) (.\[\d\dm)?testOne \(Tests\.elm:21:1\)/g);
      expect(failureMessage).to.match(/all \(Tests\.elm:7:1\)/);
      expect(failureMessage).to.match(/3\) (.\[\d\dm)?testTwo \(Tests\.elm:28:1\)/g);
      expect(failureMessage).to.match(/suiteTwo \(Tests\.elm:15:1\)/);
    });
  });

  describe("unisolated", () => {
    it("should fail analysis and report", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/unisolated");

      // assert
      reporterExpect(result).analysisSummary(0, 2);
      reporterExpect(result).analysisOverExposed();
      expect(result.code).to.equal(1);

      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);
      expect(failureMessage).to.match(/1\) (.\[\d\dm)?all \(ChildTest\.elm:7:1\)/g);
      expect(failureMessage).to.match(/all \(Tests\.elm:7:1\)/);
      expect(failureMessage).to.match(/2\) (.\[\d\dm)?all \(GrandChildTest\.elm:7:1\)/g);
      expect(failureMessage).to.match(/all \(ChildTest\.elm:7:1\)/);
    });
  });

  describe("untyped-test", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "./tests/analysis/untyped-test");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });
});
