"use strict";

import * as chai from "chai";
import {TestRunner} from "../lib/test-runner";
import reporterExpect from "../lib/default-reporter-expect";
import {Util} from "../lib/util";

let expect = chai.expect;

describe("elm-test-performance", () => {
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
    runner.cleanBuildArtifacts();
  });

  describe("1000", () => {
    it("should report success", () => {
      // act
      let result = runner.run(testContext, "elm-test", "performance/1000/Tests.elm");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1000, 0);
      expect(result.code).to.equal(0);
    });
  });
});
