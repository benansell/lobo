"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as SinonChai from "sinon-chai";
import {createUtil, Util, UtilImp} from "../../../lib/util";
import {Logger} from "../../../lib/logger";
import {PluginConfig} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib util", () => {
  let RewiredUtil = rewire("../../../lib/util");
  let util: UtilImp;
  let mockLogger: Logger;

  beforeEach(() => {
    let rewiredImp = RewiredUtil.__get__("UtilImp");
    mockLogger = <any> Sinon.mock();
    mockLogger.debug = <any> Sinon.stub();
    mockLogger.info = <any> Sinon.stub();
    mockLogger.error = <any> Sinon.stub();
    mockLogger.trace = <any> Sinon.stub();
    util = new rewiredImp(mockLogger);
  });

  describe("createUtil", () => {
    it("should return util", () => {
      // act
      let actual: Util = createUtil();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("availablePlugins", () => {
    let revertDirName: () => void;
    let revertShellJs: () => void;
    let mockFind: SinonStub;

    beforeEach(() => {
      revertDirName = RewiredUtil.__set__({"__dirname": "baz"});
      mockFind = Sinon.stub();
      revertShellJs = RewiredUtil.__set__({shelljs: {find: mockFind}});
    });

    afterEach(() => {
      revertDirName();
      revertShellJs();
    });

    it("should return list of plugin directories containing plugins matching filespec", () => {
      // arrange
      mockFind.returns(["plugin/1/foo", "plugin/2/foobar"]);

      // act
      let actual = util.availablePlugins("foo");

      // assert
      expect(actual.length).to.equal(2);
      expect(actual).to.include("1");
      expect(actual).to.include("2");
    });
  });

  describe("checkNodeVersion", () => {
    let mockExit;
    let mockLogInfo;
    let mockLogError;
    let processMajor;
    let processMinor;
    let processPatch;

    beforeEach(() => {
      mockExit = Sinon.stub(process, "exit");

      let processVersion = process.versions.node.split(".");
      processMajor = parseInt(processVersion[0], 10);
      processMinor = parseInt(processVersion[1], 10);
      processPatch = parseInt(processVersion[2], 10);

      mockLogInfo = Sinon.stub(console, "info");
      mockLogError = Sinon.stub(console, "error");
    });

    afterEach(() => {
      mockExit.restore();
      mockLogInfo.restore();
      mockLogError.restore();
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
      let values = ["foo", "bar"];

      // act
      let actual = util.closestMatch("baz", values);

      // assert
      expect(actual).to.equal("bar");
    });
  });

  describe("getPlugin", () => {
    it("should call load with supplied type", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{createPlugin: () => Plugin}> { createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      let mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied pluginName", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{createPlugin: () => Plugin}> { createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      let mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied fileSpec", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{createPlugin: () => Plugin}> { createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      let mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call load with isConfiguration false", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{createPlugin: () => Plugin}> { createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      let mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      util.getPlugin("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, false);
    });

    it("should return the loaded the plugin", () => {
      // arrange
      let expected = {name: "qux"};
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{createPlugin: () => Plugin}> { createPlugin: () => expected });
      util.load = mockLoad;

      let mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns({});
      util.getPluginConfig = mockGetPluginConfig;

      // act
      let actual = util.getPlugin("foo", "bar", "baz");

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return the loaded the plugin with config", () => {
      // arrange
      let expected = {name: "qux"};
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{createPlugin: () => Plugin}> { createPlugin: () => <Plugin>{}});
      util.load = mockLoad;

      let mockGetPluginConfig = Sinon.stub();
      mockGetPluginConfig.returns(expected);
      util.getPluginConfig = mockGetPluginConfig;

      // act
      let actual = util.getPlugin("foo", "bar", "baz");

      // assert
      expect((<{config: PluginConfig}>actual).config).to.equal(expected);
    });
  });

  describe("getPluginConfig", () => {
    it("should call load with supplied type", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied pluginName", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call load with supplied fileSpec", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call load with isConfiguration true", () => {
      // arrange
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{ PluginConfig: PluginConfig }> {PluginConfig: {}});
      util.load = mockLoad;

      // act
      util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(mockLoad).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, true);
    });

    it("should return the loaded the plugin config", () => {
      // arrange
      let expected = <PluginConfig> {name: "qux"};
      let mockLoad = Sinon.stub();
      mockLoad.returns(<{PluginConfig: PluginConfig}> { PluginConfig: expected});
      util.load = mockLoad;

      // act
      let actual = util.getPluginConfig("foo", "bar", "baz");

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("isInteger", () => {
    it("should be true when value is integer", () => {
      // act
      let actual = util.isInteger(1);

      // assert
      expect(actual).to.be.true;
    });

    it("should be false when value is float", () => {
      // act
      let actual = util.isInteger(1.23);

      // assert
      expect(actual).to.be.false;
    });
  });

  describe("padRight", () => {
    it("should not add padding when input is over length", () => {
      // act
      let actual = util.padRight("foo", 2);

      // assert
      expect(actual).to.equal("foo");
    });

    it("should not add padding when input is correct length", () => {
      // act
      let actual = util.padRight("foo", 3);

      // assert
      expect(actual).to.equal("foo");
    });

    it("should add default padding when input is short of length", () => {
      // act
      let actual = util.padRight("foo", 5);

      // assert
      expect(actual).to.equal("foo  ");
    });

    it("should add specified spacer when input is short of length", () => {
      // act
      let actual = util.padRight("foo", 5, ".");

      // assert
      expect(actual).to.equal("foo..");
    });
  });

  describe("load", () => {
    let mockExit;
    let revertPath: () => void;

    beforeEach(() => {
      mockExit = Sinon.stub(process, "exit");
    });

    afterEach(() => {
      mockExit.restore();
      revertPath();
    });

    it("should load and return elm-test plugin config", () => {
      // arrange
      let mockJoin = x => "../plugin/elm-test/plugin-config";
      revertPath = RewiredUtil.__set__({path: {join: mockJoin}});

      // act
      let actual = util.load<{PluginConfig: PluginConfig}>("foo", "bar", "baz", true);

      // assert
      expect(actual.PluginConfig.name).to.equal("elm-test");
    });

    it("should catch syntax error in config and log error", () => {
      // arrange
      let mockJoin = function() {throw new SyntaxError("foo"); };
      revertPath = RewiredUtil.__set__({path: {join: mockJoin}});

      // act
      util.load("foo", "bar", "baz", true);

      // assert
      expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/syntax error/));
    });

    it("should catch other errors in load and log error as 'not found'", () => {
      // arrange
      let mockJoin = function() {throw new Error("foo"); };
      revertPath = RewiredUtil.__set__({path: {join: mockJoin}});
      util.availablePlugins = Sinon.stub();
      util.closestMatch = Sinon.stub();

      // act
      util.load("foo", "bar", "baz", true);

      // assert
      expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/not found/));
    });

    it("should catch other errors in load suggest closest plugin name", () => {
      // arrange
      let mockJoin = function() {throw new Error("foo"); };
      revertPath = RewiredUtil.__set__({path: {join: mockJoin}});
      util.availablePlugins = Sinon.stub();
      let mockClosestMatch = Sinon.stub();
      util.closestMatch = mockClosestMatch;

        // act
      util.load("foo", "bar", "baz", false);

      // assert
      expect(mockClosestMatch).to.have.been.calledWith("bar", Sinon.match.any);
    });
  });
});
