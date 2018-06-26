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
    it("should have direct 'elm-explorations/test' dependency", () => {
      // act
      const dependency = config.dependencies.direct["elm-explorations/test"];

      // assert
      expect(dependency).to.exist;
      expect(dependency.minVersion.toString()).to.equal("1.0.0");
      expect(dependency.canEqualMin).to.be.true;
      expect(dependency.canEqualMax).to.be.false;
      expect(dependency.maxVersion.toString()).to.equal("2.0.0");
    });

    it("should have indirect 'elm/random' dependency", () => {
      // act
      const dependency = config.dependencies.indirect["elm/random"];

      // assert
      expect(dependency).to.exist;
      expect(dependency.minVersion.toString()).to.equal("1.0.0");
      expect(dependency.canEqualMin).to.be.true;
      expect(dependency.canEqualMax).to.be.false;
      expect(dependency.maxVersion.toString()).to.equal("2.0.0");
    });

    it("should have indirect 'elm/time' dependency", () => {
      // act
      const dependency = config.dependencies.indirect["elm/time"];

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
