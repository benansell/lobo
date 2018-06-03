"use strict";

import * as chai from "chai";
import {TestRunner} from "../lib/test-runner";
import reporterExpect from "../lib/default-reporter-expect";
import {Util} from "../lib/util";

let expect = chai.expect;

describe("elm-test-analysis", () => {
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

  describe("duplicate-name", () => {
    it("should pass analysis run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/analysis/duplicate-name");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(3, 1);
      expect(result.code).to.equal(1);

      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);
      expect(failureMessage)
        .to.have.string("The test 'Duplicate' contains a child test of the same name. Let's rename them so we know which is which.");
    });
  });

  describe("empty-suite", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/analysis/empty-suite");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(0, 1);
      expect(result.code).to.equal(1);

      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);
      expect(failureMessage).to.have.string("This `describe \"Test Describe\"` has no tests in it. Let's give it some!");
    });
  });

  describe("hidden", () => {
    it("should fail analysis and report", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/analysis/hidden");

      // assert
      reporterExpect(result).analysisSummary(1, 0, 0);
      reporterExpect(result).analysisHidden();
      expect(result.code).to.equal(1);
    });
  });

  describe("ignore-test-helper", () => {
    it("should pass analysis and run tests", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/analysis/ignore-test-helper");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(2, 1);
      expect(result.code).to.equal(1);
    });
  });

  describe("over-exposed", () => {
    it("should fail analysis and report", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/analysis/over-exposed");

      // assert
      reporterExpect(result).analysisSummary(0, 2, 0);
      reporterExpect(result).analysisOverExposed();
      expect(result.code).to.equal(1);
    });
  });

  describe("unisolated", () => {
    it("should fail analysis and report", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/analysis/unisolated");

      // assert
      reporterExpect(result).analysisSummary(0, 0, 0);
      reporterExpect(result).analysisUnisolated();
      expect(result.code).to.equal(1);
    });
  });
});
