"use strict";

import * as chai from "chai";
import {TestRunner} from "../lib/test-runner";
import reporterExpect from "../lib/default-reporter-expect";
import {Util} from "../lib/util";

const expect = chai.expect;

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
      const result = runner.run(testContext, "elm-test", false, "./tests/simple/pass");

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
      const result = runner.run(testContext, "elm-test", false, testDir);

      // assert
      const firstTestIndex = /1\) (.\[\d\dm)?failing Debug\.log test/g.exec(result.stdout);
      const secondTestIndex = /2\) (.\[\d\dm)?passing Debug\.log test/g.exec(result.stdout);
      let failureMessage = result.stdout.substring(firstTestIndex.index, secondTestIndex.index);
      expect(failureMessage).to.have.match(/→ (.\[\d\dm)?Bar: "Hello Bar"/);

      failureMessage = result.stdout.substring(secondTestIndex.index, result.stdout.length - 1);
      expect(failureMessage).to.have.match(/→ (.\[\d\dm)?Foo: "Hello Foo"/);
    });

    it("should not show Debug.log messages when --hideDebugMessages is supplied", () => {
      // act
      const result = runner.run(testContext, "elm-test", false, testDir, "--hideDebugMessages");

      // assert
      const startIndex = result.stdout
        .indexOf("================================================================================");
      const failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

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
      const result = runner.run(testContext, "elm-test", false, testDir);

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(0, 32);
      expect(result.code).to.equal(1);
    });

    it("should update message to use ┌ └  instead of ╷ ╵", () => {
      // act
      const result = runner.run(testContext, "elm-test", false, testDir);

      // assert
      const startIndex = result.stdout
        .indexOf("================================================================================");
      const failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).not.to.have.string("╷");
      expect(failureMessage).not.to.have.string("╵");
      expect(failureMessage).to.have.string("┌");
      expect(failureMessage).to.have.string("└");
    });

    it("should update string equals to show diff hint", () => {
      // act
      const result = runner.run(testContext, "elm-test", false, testDir);

      // assert
      const startIndex = result.stdout
        .indexOf("================================================================================");
      const failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

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
      const result = runner.run(testContext, "elm-test", false, testDir);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });

    it("should use supplied run count", () => {
      // arrange
      const expectedRunCount = 11;

      // act
      const result = runner.run(testContext, "elm-test", false, testDir, "--runCount=" + expectedRunCount);

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
      const initialSeed = 101;

      // act
      const result = runner.run(testContext, "elm-test", false, testDir, "--seed=" + initialSeed);

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
      const result = runner.run(testContext, "elm-test", false, "./tests/simple/nested");

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(3, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe("tree", () => {
    it("should report failure", () => {
      // act
      const result = runner.run(testContext, "elm-test", false, "./tests/simple/tree");

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(10, 6);
      expect(result.stdout).to.matches(/SuiteA(.|\r|\n)*Branch(.|\r|\n)*FailingTest(.|\r|\n)*1\)(.|\r|\n)*FailingTest - Branch/);
      expect(result.stdout).to
        .matches(/SuiteA(.|\r|\n)*Branch(.|\r|\n)*Leaf(.|\r|\n)*FailingTest(.|\r|\n)*2\)(.|\r|\n)*FailingTest - Leaf/);
      expect(result.stdout).to.matches(/SuiteA(.|\r|\n)*FailingTest(.|\r|\n)*3\)(.|\r|\n)*FailingTest - Suite A/);
      expect(result.stdout).to
        .matches(/SuiteB(.|\r|\n)*Branch(.|\r|\n)*Leaf(.|\r|\n)*FailingTest(.|\r|\n)*4\)(.|\r|\n)*FailingTest - Leaf/);
      expect(result.stdout).to.matches(/SuiteB(.|\r|\n)*ConcatTest(.|\r|\n)*5\)(.|\r|\n)*FailingTest - Concat/);
      expect(result.stdout).to.matches(/SuiteB(.|\r|\n)*FailingTest(.|\r|\n)*6\)(.|\r|\n)*FailingTest - Suite B/);
      expect(result.code).to.equal(1);
    });
  });

  describe("only", () => {
    it("should report only passed", () => {
      // act
      const result = runner.run(testContext, "elm-test", false, "./tests/simple/only", "--runCount=5");

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
      const result = runner.run(testContext, "elm-test", false, "./tests/simple/skip");

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
      const result = runner.run(testContext, "elm-test", false, "./tests/simple/todo");

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, 1);
      expect(result.code).to.equal(0);
    });
  });
});
