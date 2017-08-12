"use strict";

import * as os from "os";
import * as chai from "chai";
import {TestRunner} from "../../lib/test-runner";
import reporterExpect from "../../lib/default-reporter-expect";
import {Util} from "../../lib/util";

let expect = chai.expect;

describe("elm-test-extra-simple", () => {
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
      let result = runner.run(testContext, "elm-test-extra");

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
      let result = runner.run(testContext, "elm-test-extra");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(0, 32);
      expect(result.code).to.equal(1);
    });

    it("should update message to use ┌ └  instead of ╷ ╵", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra");

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
      let result = runner.run(testContext, "elm-test-extra");

      // assert
      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}┌ \"foobar\"" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}│\\s{3}\\^ \\^\\^\\^\\s" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}│ Expect.equal" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}│" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}└ \"fao\"" + os.EOL), "g");

      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}┌ \"\"" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}│" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}│ Expect.equal" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}│" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{4}└ \" \"" + os.EOL), "g");
      expect(failureMessage).to.match(new RegExp(os.EOL + "\\s{11}" + os.EOL), "g");
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
      let result = runner.run(testContext, "elm-test-extra");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });

    it("should use supplied run count", () => {
      // arrange
      let expectedRunCount = 11;

      // act
      let result = runner.run(testContext, "elm-test-extra", "--runCount=" + expectedRunCount);

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
      let result = runner.run(testContext, "elm-test-extra", "--seed=" + initialSeed);

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
      let result = runner.run(testContext, "elm-test-extra");

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
      let result = runner.run(testContext, "elm-test-extra");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(10, 4);
      expect(result.stdout).to.matches(new RegExp(`Tests${os.EOL}.+Suite A${os.EOL}.+SecondChildTest${os.EOL}.+1\\) FailingTest - Child`));
      expect(result.stdout).to.matches(new RegExp(`Tests${os.EOL}.+Suite A${os.EOL}.+SecondChildTest(.|${os.EOL})`
        + `+FailingGrandChildTest${os.EOL}.+2\\) FailingTest - GrandChild`));
      expect(result.stdout)
        .to.matches(new RegExp(`Tests(.|${os.EOL})+Suite B${os.EOL}.+SecondChildTest${os.EOL}.+3\\) FailingTest - Child`));
      expect(result.stdout).to.matches(new RegExp(`Tests(.|${os.EOL})+Suite B${os.EOL}.+SecondChildTest(.|${os.EOL})`
        + `+FailingGrandChildTest${os.EOL}.+4\\) FailingTest - GrandChild`));

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

    it("should report focused passed", () => {
      // act
      let result = runner.run(testContext, "elm-test-extra", "--runCount=5");

      // assert
      reporterExpect(result).summaryFocused();
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(3, 0, null, null, 3);
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
      let result = runner.run(testContext, "elm-test-extra");

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, null, 5);
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
      let result = runner.run(testContext, "elm-test-extra");

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, 1);
      expect(result.code).to.equal(0);
    });
  });
});
