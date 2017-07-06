"use strict";

import * as chai from "chai";
import {PluginTestFrameworkConfig} from "../../../../lib/plugin";
import {ElmTestConfig} from "../../../../plugin/elm-test/plugin-config";


let expect = chai.expect;
chai.use(require("chai-things"));

describe("plugin elm-test plugin-config", () => {
  let config: PluginTestFrameworkConfig;

  beforeEach(() => {
    config = new ElmTestConfig();
  });

  describe("options", () => {
    it("should have '--seed' option", () => {
      // act
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--seed <value>");
    });

    it("should have '--runCount' option", () => {
      // act
      let options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--runCount <value>");
    });
  });

  describe("dependencies", () => {
    it("should have 'elm-community/elm-test' dependency", () => {
      // act
      let dependencies = config.dependencies;

      // assert
      expect(dependencies).to.have.property("elm-community/elm-test", "4.0.0 <= v < 5.0.0");
    });

    it("should have 'mgold/elm-random-pcg' dependency", () => {
      // act
      let dependencies = config.dependencies;

      // assert
      expect(dependencies).to.have.property("mgold/elm-random-pcg", "5.0.0 <= v < 6.0.0");
    });
  });

  describe("sourceDirectories", () => {
    it("should have 'runner' directory", () => {
      // act
      let dirs = config.sourceDirectories;

      // assert
      expect(dirs).to.include("runner");
    });

    it("should have 'plugin/elm-test' directory", () => {
      // act
      let dirs = config.sourceDirectories;

      // assert
      expect(dirs).to.include("plugin/elm-test");
    });
  });
});