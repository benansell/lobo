"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import {PluginTestFramework, RunArgs} from "../../../../lib/plugin";
import {createPlugin, ElmTestExtraPlugin} from "../../../../plugin/elm-test-extra/test-plugin";

let expect = chai.expect;

describe("plugin elm-test-extra test-plugin", () => {
  let RewiredPlugin = rewire("./../../../../plugin/elm-test-extra/test-plugin");
  let plugin: PluginTestFramework;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("ElmTestExtraPlugin");
    plugin = new rewiredImp();
  });

  describe("createPlugin", () => {
    it("should return elm test plugin", () => {
      // act
      let actual: ElmTestExtraPlugin = createPlugin();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("initArgs", () => {
    it("should use the supplied seed value when it exists", () => {
      // arrange
      let revertProgram = RewiredPlugin.__with__({program: {seed: 123}});

      // act
      let actual: RunArgs = undefined;
      revertProgram(() => actual = plugin.initArgs());

      // assert
      expect(actual.seed).to.equal(123);
    });

    it("should use the supplied runCount value when it exists", () => {
      // arrange
      let revertProgram = RewiredPlugin.__with__({program: {runCount: 123}});

      // act
      let actual: RunArgs = undefined;
      revertProgram(() => actual = plugin.initArgs());

      // assert
      expect(actual.runCount).to.equal(123);
    });

    it("should generate a seed value no value is supplied", () => {
      // arrange
      let revertProgram = RewiredPlugin.__with__({program: {seed: undefined}});

      // act
      let actual: RunArgs = undefined;
      revertProgram(() => actual = plugin.initArgs());

      // assert
      expect(actual.seed).not.to.be.undefined;
    });

    it("should generate a different seed value each time when no value is supplied", () => {
      // arrange
      let revertProgram = RewiredPlugin.__with__({program: {seed: undefined}});

      // act
      let first: RunArgs = undefined;
      let second: RunArgs = undefined;

      revertProgram(() => {
        first = plugin.initArgs();
        second = plugin.initArgs();
      });

      // assert
      expect(first.seed).not.to.equal(second.seed);
    });
  });

  describe("pluginElmModuleName", () => {
    it("should return 'ElmTestExtraPlugin'", () => {
      // act
      let actual = plugin.pluginElmModuleName();

      // assert
      expect(actual).to.equal("ElmTestExtraPlugin");
    });
  });

  describe("testFrameworkElmModuleName", () => {
    it("should return 'ElmTestTest.Extra'", () => {
      // act
      let actual = plugin.testFrameworkElmModuleName();

      // assert
      expect(actual).to.equal("ElmTest.Extra");
    });
  });
});
