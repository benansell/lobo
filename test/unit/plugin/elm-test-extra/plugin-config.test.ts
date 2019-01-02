"use strict";

import * as chai from "chai";
import {PluginTestFrameworkConfig} from "../../../../lib/plugin";
import {ElmTestExtraConfig} from "../../../../plugin/elm-test-extra/plugin-config";

const expect = chai.expect;
chai.use(require("chai-things"));

describe("plugin elm-test-extra plugin-config", () => {
  let config: PluginTestFrameworkConfig;

  beforeEach(() => {
    config = new ElmTestExtraConfig();
  });

  describe("options", () => {
    it("should have '--seed' option", () => {
      // act
      const options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--seed <value>");
    });

    it("should have '--runCount' option", () => {
      // act
      const options = config.options;

      // assert
      expect(options).to.include.something.that.property("flags", "--runCount <value>");
    });
  });

  describe("dependencies", () => {
    it("should have direct 'benansell/lobo-elm-test-extra' dependency", () => {
      // act
      const dependency = config.dependencies["benansell/lobo-elm-test-extra"];

      // assert
      expect(dependency).to.exist;
      expect(dependency.minVersion.toString()).to.equal("3.0.0");
      expect(dependency.canEqualMin).to.be.true;
      expect(dependency.canEqualMax).to.be.false;
      expect(dependency.maxVersion.toString()).to.equal("4.0.0");
    });

    it("should have direct 'elm-explorations/test' dependency", () => {
      // act
      const dependency = config.dependencies["elm-explorations/test"];

      // assert
      expect(dependency).to.exist;
      expect(dependency.minVersion.toString()).to.equal("1.2.0");
      expect(dependency.canEqualMin).to.be.true;
      expect(dependency.canEqualMax).to.be.false;
      expect(dependency.maxVersion.toString()).to.equal("2.0.0");
    });

    it("should have direct 'elm/random' dependency", () => {
      // act
      const dependency = config.dependencies["elm/random"];

      // assert
      expect(dependency).to.exist;
      expect(dependency.minVersion.toString()).to.equal("1.0.0");
      expect(dependency.canEqualMin).to.be.true;
      expect(dependency.canEqualMax).to.be.false;
      expect(dependency.maxVersion.toString()).to.equal("2.0.0");
    });

    it("should have direct 'elm/time' dependency", () => {
      // act
      const dependency = config.dependencies["elm/time"];

      // assert
      expect(dependency).to.exist;
      expect(dependency.minVersion.toString()).to.equal("1.0.0");
      expect(dependency.canEqualMin).to.be.true;
      expect(dependency.canEqualMax).to.be.false;
      expect(dependency.maxVersion.toString()).to.equal("2.0.0");
    });
  });

  describe("sourceDirectories", () => {
    it("should have 'runner' directory", () => {
      // act
      const dirs = config.sourceDirectories;

      // assert
      expect(dirs).to.include("runner");
    });

    it("should have 'plugin/elm-test-extra' directory", () => {
      // act
      const dirs = config.sourceDirectories;

      // assert
      expect(dirs).to.include("plugin/elm-test-extra");
    });
  });
});
