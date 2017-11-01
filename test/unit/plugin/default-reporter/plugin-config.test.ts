"use strict";

import * as chai from "chai";
import {PluginConfig} from "../../../../lib/plugin";
import {DefaultReporterConfig} from "../../../../plugin/default-reporter/plugin-config";

let expect = chai.expect;
chai.use(require("chai-things"));

describe("plugin default-reporter plugin-config", () => {

  let config: PluginConfig;

  beforeEach(() => {
    config = new DefaultReporterConfig();
  });

  describe("options", () => {
    it("should have '--hideDebugMessages' option", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--hideDebugMessages");
    });

    it("should have '--showSkip' option", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--showSkip");
    });

    it("should have '--showTodo' option", () => {
      // act
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--showTodo");
    });
  });
});
