"use strict";

import * as chai from "chai";
import * as chalk from "chalk";
import rewire = require("rewire");

import * as sinonChai from "sinon-chai";
import {DefaultReporterImp} from "../../../../plugin/default-reporter/reporter-plugin";
import {ProgressReport, ResultType} from "../../../../lib/plugin";

let expect = chai.expect;
chai.use(sinonChai);

describe("plugin default-reporter reporter-plugin", () => {
  let RewiredPlugin = rewire("./../../../../plugin/default-reporter/reporter-plugin");
  let reporter: DefaultReporterImp;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("DefaultReporterImp");
    reporter = new rewiredImp();
  });

  describe("update", () => {
    let original;
    let output;

    function write(str): boolean {
      output += str;
      
      return true;
    }

    beforeEach(() => {
      output = "";
      original = process.stdout.write;
      process.stdout.write = write;

      reporter.init();
    });

    afterEach(() => {
      process.stdout.write = original;
    });

    it("should report '.' when a test has 'PASSED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "PASSED"});

      // assert
      expect(output).to.equal(".");
    });

    it("should report '!' when a test has 'FAILED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "FAILED"});

      // assert
      expect(output).to.equal(chalk.red("!"));
    });

    it("should report '?' when a test has 'SKIPPED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "SKIPPED"});

      // assert
      expect(output).to.equal(chalk.yellow("?"));
    });

    it("should report '-' when a test has 'SKIPPED'", () => {
      // act
      reporter.update(<ProgressReport>{resultType: "TODO"});

      // assert
      expect(output).to.equal(chalk.yellow("-"));
    });

    it("should report ' ' when reportProgress is undefined", () => {
      // act
      reporter.update(undefined);

      // assert
      expect(output).to.equal(" ");
    });

    it("should report ' ' when a test has unknown resultType", () => {
      // act
      reporter.update(<ProgressReport>{resultType: <ResultType>"foo bar"});

      // assert
      expect(output).to.equal(" ");
    });
  });
});
