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
    it("should have '--reportFile' option", () => {
      // act'
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--reportFile <value>");
    });
  });
});
