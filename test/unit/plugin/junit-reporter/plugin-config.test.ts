"use strict";

import * as chai from "chai";
import {PluginConfig} from "../../../../lib/plugin";
import {JUnitReporterConfig} from "../../../../plugin/junit-reporter/plugin-config";

let expect = chai.expect;
chai.use(require("chai-things"));

describe("plugin junit-reporter plugin-config", () => {

  let config: PluginConfig;

  beforeEach(() => {
    config = new JUnitReporterConfig();
  });

  describe("options", () => {
    it("should have optional '--diffMaxLength' option", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--diffMaxLength [value]");
    });

    it("should have '--diffMaxLength' option with default of 150", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("defaultValue", 150);
    });

    it("should have optional '--junitFormat' option", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--junitFormat [value]");
    });

    it("should have '--junitFormat' option with default of text", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("defaultValue", "text");
    });

    it("should have '--reportFile' option", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--reportFile <value>");
    });
  });

  describe("parseDiffMaxLength", () => {
    it("should parse string value to int", () => {
      // act
      let actual = JUnitReporterConfig.parseDiffMaxLength("123");

      // assert
      expect(actual).to.equal(123);
    });
  });
});
