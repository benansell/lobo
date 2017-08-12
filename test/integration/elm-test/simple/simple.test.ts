"use strict";

import * as chai from "chai";
import {TestRunner} from "../../lib/test-runner";
import reporterExpect from "../../lib/default-reporter-expect";
import {Util} from "../../lib/util";

let expect = chai.expect;

describe("elm-test-simple", () => {
  let runner: TestRunner;
  let testContext: string[];
  let util: Util;

  before(() => {
    runner = new TestRunner();
    util = new Util();
    testContext = util.initializeTestContext(__dirname);
    util.cd(__dirname);
  });

  describe("pass", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "pass");
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
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("fail", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "fail");
      runner.clean();
    });

    afterEach(() => {
      runner.contextPop(testContext);
    });

    it("should report failure", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(0, 31);
      expect(result.code).to.equal(1);
    });

    it("should update message to use ┌ └  instead of ╷ ╵", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).not.to.have.string("╷");
      expect(failureMessage).not.to.have.string("╵");
      expect(failureMessage).to.have.string("┌");
      expect(failureMessage).to.have.string("└");
    });

    it("should update string equals to show diff hint", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).to.match(/\r*\n\s{4}┌ "foobar"\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}│\s{3}\^ \^\^\^\s\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}│ Expect.equal\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}│\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}└ "fao"/g);
    });
  });

  describe("fuzz", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "fuzz");
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
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });

    it("should use supplied run count", () => {
      // arrange
      let expectedRunCount = 11;

      // act
      let result = runner.run(testContext, "elm-test", "--runCount=" + expectedRunCount);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      reporterExpect(result).summaryArgument("runCount", <{}>expectedRunCount);

      expect(result.stdout.match(/fuzzingTest-Executed/g).length).to.equal(expectedRunCount);
      expect(result.stdout.match(/listLengthTest-Executed/g).length).to.equal(expectedRunCount);
      expect(result.stdout.match(/fuzz2Test-Executed/g).length).to.equal(expectedRunCount);

      // fuzzWithTest runs property should override the supplied value
      expect(result.stdout.match(/fuzzWithTest-Executed/g).length).to.equal(13);

      expect(result.code).to.equal(0);
    });

    it("should use supplied initial seed", () => {
      // arrange
      let initialSeed = 101;

      // act
      let result = runner.run(testContext, "elm-test", "--seed=" + initialSeed);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      reporterExpect(result).summaryArgument("seed", <{}>initialSeed);
      expect(result.code).to.equal(0);
    });
  });

  describe("nested", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "nested");
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
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("tree", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "tree");
      runner.clean();
    });

    afterEach(() => {
      runner.contextPop(testContext);
    });

    it("should report failure", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(12, 6);
      expect(result.stdout).to.matches(/Tests\r?\n.+Suite A\r?\n.+1\) FailingTest - Concat/);
      expect(result.stdout).to.matches(/Tests\r?\n.+Suite A(.|\r?\n)+SecondChildTest\r?\n.+2\) FailingTest - Child/);
      expect(result.stdout).to.matches(
        /Tests\r?\n.+Suite A(.|\r?\n)+SecondChildTest(.|\r?\n)+FailingGrandChildTest\r?\n.+3\) FailingTest - GrandChild/);
      expect(result.stdout).to.matches(/Tests(.|\r?\n)+Suite B\r?\n.+4\) FailingTest - Concat/);
      expect(result.stdout).to.matches(/Tests(.|\r?\n)+Suite B(.|\r?\n)+SecondChildTest\r?\n.+5\) FailingTest - Child/);
      expect(result.stdout).to.matches(
        /Tests(.|\r?\n)+Suite B(.|\r?\n)+SecondChildTest(.|\r?\n)+FailingGrandChildTest\r?\n.+6\) FailingTest - GrandChild/);
      expect(result.code).to.equal(1);
    });
  });

  describe("only", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "only");
      runner.clean();
    });

    afterEach(() => {
      runner.contextPop(testContext);
    });

    it("should report only passed", () => {
      // act
      let result = runner.run(testContext, "elm-test", "--runCount=5");

      // assert
      reporterExpect(result).summaryPartial();
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(3, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("skip", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "skip");
      runner.clean();
    });

    afterEach(() => {
      runner.contextPop(testContext);
    });

    it("should report inconclusive", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      reporterExpect(result).summaryPartial();
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("todo", () => {
    beforeEach(() => {
      runner.contextPush(testContext, "todo");
      runner.clean();
    });

    afterEach(() => {
      runner.contextPop(testContext);
    });

    it("should report inconclusive", () => {
      // act
      let result = runner.run(testContext, "elm-test");

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, 1);
      expect(result.code).to.equal(0);
    });
  });
});
