"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as path from "path";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as SinonChai from "sinon-chai";
import {createUtil, Util, UtilImp} from "../../../lib/util";
import {Logger} from "../../../lib/logger";
import {PluginConfig} from "../../../lib/plugin";
import {Stats} from "fs";

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib util", () => {
  const RewiredUtil = rewire("../../../lib/util");
  let util: UtilImp;
  let mockLogger: Logger;
  let mockDirName: SinonStub;
  let mockExec: Sinon.SinonStub;
  let mockExit: SinonStub;
  let mockExists: SinonStub;
  let mockJoin: Sinon.SinonStub;
  let mockLstat: SinonStub;
  let mockReadFileSync: SinonStub;
  let mockRealPath: SinonStub;
  let mockRelativePath: SinonStub;
  let mockResolvePath: SinonStub;
  let mockVersions: SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockDirName = Sinon.stub();
    mockExec = Sinon.stub();
    mockExit = Sinon.stub();
    mockExists = Sinon.stub();
    mockJoin = Sinon.stub();
    mockLstat = Sinon.stub();
    mockReadFileSync = Sinon.stub();
    mockRealPath = Sinon.stub();
    mockRelativePath = Sinon.stub();
    mockResolvePath = Sinon.stub();
    mockVersions = Sinon.stub();

    revert = RewiredUtil.__set__({
      fs: {existsSync: mockExists, lstatSync: mockLstat, readFileSync: mockReadFileSync,
        realpathSync: mockRealPath},
      path: {dirname: mockDirName, join: mockJoin, relative: mockRelativePath, resolve: mockResolvePath},
      process: {exit: mockExit, versions: mockVersions}
    });
    const rewiredImp = RewiredUtil.__get__("UtilImp");

    mockLogger = <Logger><{}>Sinon.mock();
    mockLogger.debug = Sinon.stub();
    mockLogger.info = Sinon.stub();
    mockLogger.error = Sinon.stub();
    mockLogger.trace = Sinon.stub();
    util = new rewiredImp(mockLogger);
  });

  afterEach(() => {
    revert();
  });

  describe("createUtil", () => {
    it("should return util", () => {
      // act
      const actual: Util = createUtil();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("availablePlugins", () => {
    it("should return list of plugin directories containing plugins matching filespec", () => {
      // arrange
      const mockFind = Sinon.stub();
      mockFind.returns(["plugin/1/foo.js", "plugin/2/foobar.js"]);
      const revertShellJs = RewiredUtil.__with__({"__dirname": "baz", shelljs: {find: mockFind}, path: path});

      // act
      let actual: string[] = undefined;
      revertShellJs(() => actual = util.availablePlugins("foo"));

      // assert
      expect(actual.length).to.equal(2);
      expect(actual).to.include("1");
      expect(actual).to.include("2");
    });
  });

  describe("checkNodeVersion", () => {
    let processMajor;
    let processMinor;
    let processPatch;

    beforeEach(() => {
      processMajor = 123;
      processMinor = 456;
      processPatch = 789;
      (<{ node: string }><{}>mockVersions).node = "123.456.789";
    });

    it("should throw error when major is not an integer", () => {
      expect(() => {
        util.checkNodeVersion(1.9, 2, 3);
      }).to.throw("major is not an integer");
    });

    it("should throw error when minor is not an integer", () => {
      expect(() => {
        util.checkNodeVersion(1, 2.9, 3);
      }).to.throw("minor is not an integer");
    });

    it("should throw error when patch is not an integer", () => {
      expect(() => {
        util.checkNodeVersion(1, 2, 3.9);
      }).to.throw("patch is not an integer");
    });

    it("should exit the process when major version is too low", () => {
      // act
      util.checkNodeVersion(processMajor + 1, 0, 0);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should exit the process when minor version is too low", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor + 1, 0);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should exit the process when patch version is too low", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch + 1);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should not exit the process version is at minimum", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch);

      // assert
      expect(mockExit).not.to.have.been.calledWith(1);
    });

    it("should not exit the process version is above minimum", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch - 1);

      // assert
      expect(mockExit).not.to.have.been.calledWith(1);
    });
  });

  describe("closestMatch", () => {
    it("should return item with min levenshtein distance", () => {
      // arrange
      const values = ["foo", "bar"];

      // act
      const actual = util.closestMatch("baz", values);

      // assert
      expect(actual).to.equal("bar");
    });
  });

  describe("getPlugin", () => {
    it("should call load with supplied type", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ createPlugin: () => Plugin }> {createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      const mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied pluginName", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ createPlugin: () => Plugin }> {createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      const mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied fileSpec", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ createPlugin: () => Plugin }> {createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      const mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call load with isConfiguration false", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ createPlugin: () => Plugin }> {createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      const mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, false);
    });

    it("should return the loaded the plugin", () => {
      // arrange
      const expected = {name: "qux"};
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ createPlugin: () => Plugin }> {createPlugin: () => expected});
      util.load = mockLoad;

      const mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      const actual = util.getPlugin("foo", "bar", "baz");

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("getPluginConfig", () => {
    it("should call load with supplied type", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied pluginName", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied fileSpec", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call load with isConfiguration true", () => {
      // arrange
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, true);
    });

    it("should return the loaded the plugin config", () => {
      // arrange
      const expected = <PluginConfig> {name: "qux"};
      const mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: expected});
      util.load = mockLoad;

      // act
      const actual = util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("isInteger", () => {
    it("should be true when value is integer", () => {
      // act
      const actual = util.isInteger(1);

      // assert
      expect(actual).to.be.true;
    });

    it("should be false when value is float", () => {
      // act
      const actual = util.isInteger(1.23);

      // assert
      expect(actual).to.be.false;
    });
  });

  describe("logStage", () => {
    it("should call logger.info with message that is 80 long", () => {
      // act
      util.logStage("foo");

      // assert
      expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/.{80}/));
    });

    it("should call logger.info with the supplied stage surrounded by square brackets", () => {
      // act
      util.logStage("foo");

      // assert
      expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/\[ foo ]/));
    });

    it("should call logger.info with the supplied stage prefixed by 37 '-'", () => {
      // act
      util.logStage("foo");

      // assert
      expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/^-{37}/));
    });

    it("should call logger.info with the supplied stage suffixed by 36 '-'", () => {
      // act
      util.logStage("foo");

      // assert
      expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/-{36}$/));
    });
  });

  describe("padRight", () => {
    it("should not add padding when input is over length", () => {
      // act
      const actual = util.padRight("foo", 2);

      // assert
      expect(actual).to.equal("foo");
    });

    it("should not add padding when input is correct length", () => {
      // act
      const actual = util.padRight("foo", 3);

      // assert
      expect(actual).to.equal("foo");
    });

    it("should add default padding when input is short of length", () => {
      // act
      const actual = util.padRight("foo", 5);

      // assert
      expect(actual).to.equal("foo  ");
    });

    it("should add specified spacer when input is short of length", () => {
      // act
      const actual = util.padRight("foo", 5, ".");

      // assert
      expect(actual).to.equal("foo..");
    });
  });

  describe("load", () => {
    it("should load and return elm-test plugin config", () => {
      // arrange
      mockJoin.returns("../plugin/elm-test/plugin-config");
      const revertPath = RewiredUtil.__with__({path: {join: mockJoin}});

      // act
      let actual: { PluginConfig: PluginConfig } = undefined;
      revertPath(() => actual = util.load<{ PluginConfig: PluginConfig }>("foo", "bar", "baz", true));

      // assert
      expect(actual.PluginConfig.name).to.equal("elm-test");
    });

    it("should catch syntax error in config and log error", () => {
      // arrange
      mockJoin.throws(new SyntaxError("foo"));
      const revertPath = RewiredUtil.__with__({path: {join: mockJoin}});

      // act
      revertPath(() => util.load("foo", "bar", "baz", true));

      // assert
      expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/syntax error/));
    });

    it("should catch other errors in load and log error as 'not found'", () => {
      // arrange
      mockJoin.throws(new Error("foo"));
      const revertPath = RewiredUtil.__with__({path: {join: mockJoin}});
      util.availablePlugins = Sinon.stub();
      util.closestMatch = Sinon.stub();

      // act
      revertPath(() => util.load("foo", "bar", "baz", true));

      // assert
      expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/not found/));
    });

    it("should catch other errors in load suggest closest plugin name", () => {
      // arrange
      mockJoin.throws(new Error("foo"));
      const revertPath = RewiredUtil.__with__({path: {join: mockJoin}});
      util.availablePlugins = Sinon.stub();
      const mockClosestMatch = Sinon.stub();
      util.closestMatch = mockClosestMatch;

      // act
      revertPath(() => util.load("foo", "bar", "baz", false));

      // assert
      expect(mockClosestMatch).to.have.been.calledWith("bar", Sinon.match.any);
    });
  });

  describe("read", () => {
    it("should be undefined when file does not exist", () => {
      // arrange
      mockExists.returns(false);

      // act
      const actual = util.read("/foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should be undefined when fs.readFileSync throws an error", () => {
      // arrange
      mockExists.returns(true);
      mockReadFileSync.throws(new Error("foo"));

      // act
      const actual = util.read("/foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return raw file when it exists", () => {
      // arrange
      mockExists.returns(true);
      mockReadFileSync.returns("bar");

      // act
      const actual = util.read("foo");

      // assert
      expect(actual).to.equal("bar");
    });

  });

  describe("resolveDir", () => {
    it("should return the resolved path when it does not exist", () => {
      // arrange
      mockExists.returns(false);
      mockResolvePath.returns("/bar");

      // act
      const actual = util.resolveDir("foo");

      // assert
      expect(actual).to.equal("/bar");
    });

    it("should return the resolved path when it exists and is not a symbolic link", () => {
      // arrange
      mockExists.returns(true);
      const mockStats = <Stats> {};
      mockStats.isSymbolicLink = () => false;
      mockLstat.returns(mockStats);
      mockResolvePath.returns("/bar");

      // act
      const actual = util.resolveDir("foo");

      // assert
      expect(actual).to.equal("/bar");
    });

    it("should return the real path when it exists is a symbolic link", () => {
      // arrange
      mockExists.returns(true);
      const mockStats = <Stats> {};
      mockStats.isSymbolicLink = () => true;
      mockLstat.returns(mockStats);
      mockResolvePath.returns("/bar");
      mockRealPath.returns("/baz");

      // act
      const actual = util.resolveDir("foo");

      // assert
      expect(actual).to.equal("/baz");
    });
  });

  describe("sortObject", () => {
    it("should return empty object when supplied value has no keys", () => {
      // act
      const actual = util.sortObject({});

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should return sorted object when supplied value has keys", () => {
      // arrange

      // act
      const actual = util.sortObject({"def": 1, "abc": 2});

      // assert
      expect(actual).to.deep.equal({"abc": 2, "def": 1});
    });
  });

});
