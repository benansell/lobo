"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import {PluginTestFramework} from "../../../../lib/plugin";

let expect = chai.expect;

describe("plugin elm-test", () => {
  let RewiredPlugin = rewire("./../../../../plugin/elm-test/test-plugin");
  let plugin: PluginTestFramework;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("ElmTestPlugin");
    plugin = new rewiredImp();
  });

  describe("initArgs", () => {
    it("should use the supplied seed value when it exists", () => {
      // arrange
      RewiredPlugin.__set__({program: {seed: 123}});

      // act
      let actual = plugin.initArgs();

      // assert
      expect(actual.seed).to.equal(123);
    });

    it("should use the supplied runCount value when it exists", () => {
      // arrange
      RewiredPlugin.__set__({program: {runCount: 123}});

      // act
      let actual = plugin.initArgs();

      // assert
      expect(actual.runCount).to.equal(123);
    });

    it("should generate a seed value no value is supplied", () => {
      // arrange
      RewiredPlugin.__set__({program: {seed: undefined}});

      // act
      let actual = plugin.initArgs();

      // assert
      expect(actual.seed).not.to.be.undefined;
    });

    it("should generate a different seed value each time when no value is supplied", () => {
      // arrange
      RewiredPlugin.__set__({program: {seed: undefined}});

      // act
      let first = plugin.initArgs();
      let second = plugin.initArgs();

      // assert
      expect(first.seed).not.to.equal(second.seed);
    });
  });
});
