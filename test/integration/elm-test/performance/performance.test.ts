"use strict";

import * as chai from "chai";
import {TestRunner} from "../../lib/test-runner";
import reporterExpect from "../../lib/default-reporter-expect";
import {Util} from "../../lib/util";

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
  });

  describe("1000", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "1000");
      runner.clean();
    });

    afterEach(() => {
      runner.contextPop(testContext);
    });

    it("should report success", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1000, 0);
      expect(result.code).to.equal(0);
    });
  });
});
