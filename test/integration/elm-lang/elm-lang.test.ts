"use strict";

import * as chai from "chai";

import {TestRunner} from "../lib/test-runner";
import reporterExpect from "../lib/default-reporter-expect";
import {Util} from "../lib/util";

let expect = chai.expect;

describe("elm-lang", () => {
  let runner: TestRunner;
  let testContext: string[];
  let util: Util;

  before(() => {
    runner = new TestRunner();
    util = new Util();
    testContext = util.initializeTestContext(__dirname);
    util.cd(__dirname);
  });

  describe("import-check", () => {
    beforeEach(() => {
      runner.clean();
    });

    it("should build and report success test run", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });
  });
});
