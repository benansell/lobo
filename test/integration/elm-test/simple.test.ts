"use strict";

import * as chai from "chai";
import {TestRunner} from "../lib/test-runner";
import reporterExpect from "../lib/default-reporter-expect";
import {Util} from "../lib/util";

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
    runner.clean();
  });

  beforeEach(() => {
    runner.cleanLoboAndBuildArtifacts();
  });

  describe("pass", () => {
    it("should report success", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/simple/pass");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("debug", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = "./tests/simple/debug";
    });

    it("should show Debug.log messages by default", () => {
      // act
      let result = runner.run(testContext, "elm-test", testDir);

      // assert
      let firstTestIndex = /1\) (.\[\d\dm)?failing Debug\.log test/g.exec(result.stdout);
      let secondTestIndex = /2\) (.\[\d\dm)?passing Debug\.log test/g.exec(result.stdout);
      let failureMessage = result.stdout.substring(firstTestIndex.index, secondTestIndex.index);
      expect(failureMessage).to.have.match(/→ (.\[\d\dm)?Bar: "Hello Bar"/);

      failureMessage = result.stdout.substring(secondTestIndex.index, result.stdout.length - 1);
      expect(failureMessage).to.have.match(/→ (.\[\d\dm)?Foo: "Hello Foo"/);
    });

    it("should not show Debug.log messages when --hideDebugMessages is supplied", () => {
      // act
      let result = runner.run(testContext, "elm-test", testDir, "--hideDebugMessages");

      // assert
      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).not.to.have.string("Bar: \"Hello Bar\"");
      expect(failureMessage).not.to.have.string("passing Debug.log test");
      expect(failureMessage).not.to.have.string("Foo: \"Hello Foo\"");
    });
  });

  describe("fail", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = "./tests/simple/fail";
    });

    it("should report failure", () => {
      // act
      let result = runner.run(testContext, "elm-test", testDir);

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(0, 32);
      expect(result.code).to.equal(1);
    });

    it("should update message to use ┌ └  instead of ╷ ╵", () => {
      // act
      let result = runner.run(testContext, "elm-test", testDir);

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
      let result = runner.run(testContext, "elm-test", testDir);

      // assert
      let startIndex = result.stdout
        .indexOf("================================================================================");
      let failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).to.match(/\r*\n\s{4}┌ "foobar"\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}│ (.\[\d\dm)?\s{2}\^ \^\^\^\s(.\[\d\dm)?\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}│ (.\[\d\dm)?Expect.equal(.\[\d\dm)?\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}│\r*\n/g);
      expect(failureMessage).to.match(/\r*\n\s{4}└ "fao"/g);
    });
  });

  describe("fuzz", () => {
    let testDir: string;

    beforeEach(() => {
      testDir = "./tests/simple/fuzz";
    });

    it("should report success", () => {
      // act
      let result = runner.run(testContext, "elm-test", testDir);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });

    it("should use supplied run count", () => {
      // arrange
      let expectedRunCount = 11;

      // act
      let result = runner.run(testContext, "elm-test", testDir, "--runCount=" + expectedRunCount);

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
      let result = runner.run(testContext, "elm-test", testDir, "--seed=" + initialSeed);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      reporterExpect(result).summaryArgument("seed", <{}>initialSeed);
      expect(result.code).to.equal(0);
    });
  });

  describe("nested", () => {
    it("should report success", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/simple/nested");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(0, 3);
      expect(result.code).to.equal(0);
    });
  });

  describe("tree", () => {
    it("should report failure", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/simple/tree");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(10, 4);
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
    it("should report only passed", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/simple/only", "--runCount=5");

      // assert
      reporterExpect(result).summaryPartial();
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(3, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("skip", () => {
    it("should report inconclusive", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/simple/skip");

      // assert
      reporterExpect(result).summaryPartial();
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("todo", () => {
    it("should report inconclusive", () => {
      // act
      let result = runner.run(testContext, "elm-test", "./tests/simple/todo");

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, 1);
      expect(result.code).to.equal(0);
    });
  });
});
