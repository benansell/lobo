"use strict";

import * as path from "path";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {createOutputDirectoryManager, OutputDirectoryManager, OutputDirectoryManagerImp} from "../../../lib/output-directory-manager";
import {ExecutionContext, LoboConfig, PluginTestFrameworkWithConfig} from "../../../lib/plugin";
import {ElmPackageHelper, ElmPackageJson, UpdateCallback} from "../../../lib/elm-package-helper";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib output-directory-manager", () => {
  let RewiredOutputDirectoryManager = rewire("../../../lib/output-directory-manager");
  let rewiredImp;
  let outputDirectoryManager: OutputDirectoryManagerImp;
  let mockBasename: Sinon.SinonStub;
  let mockCp: Sinon.SinonStub;
  let mockDirname: Sinon.SinonStub;
  let mockExists: Sinon.SinonStub;
  let mockHelperRead: Sinon.SinonStub;
  let mockHelperUpdateSourceDirectories: Sinon.SinonStub;
  let mockJoin: Sinon.SinonStub;
  let mockLogger: Logger;
  let mockLn: Sinon.SinonStub;
  let mockMkDir: Sinon.SinonStub;
  let mockHelper: ElmPackageHelper;
  let mockResolvePath: Sinon.SinonStub;
  let mockTmpDirSync: Sinon.SinonStub;
  let mockUnlinkSync: Sinon.SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockBasename = Sinon.stub();
    mockCp = Sinon.stub();
    mockDirname = Sinon.stub();
    mockExists = Sinon.stub();
    mockJoin = Sinon.stub();
    mockLn = Sinon.stub();
    mockMkDir = Sinon.stub();
    mockResolvePath = Sinon.stub();
    mockTmpDirSync = Sinon.stub();
    mockUnlinkSync = Sinon.stub();

    revert = RewiredOutputDirectoryManager.__set__({
      fs: {existsSync: mockExists, unlinkSync: mockUnlinkSync},
      path: {basename: mockBasename, dirname: mockDirname, join: mockJoin, resolve: mockResolvePath},
      shelljs: {cp: mockCp, ln: mockLn, mkdir: mockMkDir},
      tmp: {dirSync: mockTmpDirSync}
    });
    rewiredImp = RewiredOutputDirectoryManager.__get__("OutputDirectoryManagerImp");
    mockLogger = <Logger> {
      debug: Sinon.stub(), error: Sinon.stub(), info: Sinon.stub(),
      trace: Sinon.stub(), warn: Sinon.stub()
    };

    mockHelperRead = Sinon.stub();
    mockHelperUpdateSourceDirectories = Sinon.stub();
    mockHelper = <ElmPackageHelper> {
      path: Sinon.stub(),
      read: mockHelperRead,
      updateDependencies: Sinon.stub(),
      updateSourceDirectories: mockHelperUpdateSourceDirectories
    };

    outputDirectoryManager = new rewiredImp(mockHelper, mockLogger);
  });

  afterEach(() => {
    revert();
  });

  describe("cleanup", () => {
    it("should not delete any files when the config.noCleanup is true", () => {
      // arrange
      outputDirectoryManager.delete = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {config: {noCleanup: true}});

      // assert
      expect(outputDirectoryManager.delete).not.to.have.been.called;
    });

    it("should not delete any files when the tempDirectory is undefined", () => {
      // arrange
      outputDirectoryManager.delete = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.delete).not.to.have.been.called;
    });

    it("should call delete with tempDir when tempDirectory and buildOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.delete = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", buildOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.delete).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call delete with buildOutputFilePath when tempDirectory and buildOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.delete = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", buildOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.delete).to.have.been.calledWith(Sinon.match.any, "bar");
    });

    it("should call delete with tempDir when tempDirectory and testSuiteOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.delete = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", testSuiteOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.delete).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call delete with testSuiteOutputFilePath when tempDirectory and testSuiteOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.delete = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", testSuiteOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.delete).to.have.been.calledWith(Sinon.match.any, "bar");
    });
  });

  describe("createOutputDirectoryManager", () => {
    it("should return main", () => {
      // act
      let actual: OutputDirectoryManager = createOutputDirectoryManager();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("configBuildDirectory", () => {
    it("should create the lobo directory if it does not exist", () => {
      // arrange
      mockExists.withArgs("foo").returns(false);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockMkDir).to.have.been.calledWith("foo");
    });

    it("should not create the lobo directory if it exists", () => {
      // arrange
      mockExists.withArgs("foo").returns(true);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockMkDir).not.to.have.been.called;
    });

    it("should create a link to the elm-stuff directory if it does not exist and elm-stuff exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-stuff").returns("./foo/elm-stuff");
      mockResolvePath.withArgs("bar", "elm-stuff").returns("./bar/elm-stuff");
      mockExists.withArgs("./foo/elm-stuff").returns(false);
      mockExists.withArgs("./bar/elm-stuff").returns(true);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockLn).to.have.been.calledWith("-s", "./bar/elm-stuff", "./foo/elm-stuff");
    });

    it("should not create a link to the elm-stuff directory if the test elm-stuff does not exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-stuff").returns("./foo/elm-stuff");
      mockResolvePath.withArgs("bar", "elm-stuff").returns("./bar/elm-stuff");
      mockExists.withArgs("./foo/elm-stuff").returns(false);
      mockExists.withArgs("./bar/elm-stuff").returns(false);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockLn).not.to.have.been.called;
    });

    it("should not create a link to the elm-stuff directory if the link already exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-stuff").returns("./foo/elm-stuff");
      mockResolvePath.withArgs("bar", "elm-stuff").returns("./bar/elm-stuff");
      mockExists.withArgs("./foo/elm-stuff").returns(true);
      mockExists.withArgs("./bar/elm-stuff").returns(false);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockLn).not.to.have.been.called;
    });

    it("should copy the test elm-package.json if the lobo elm-package.json does not exist", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-package.json").returns("./foo/elm-package.json");
      mockResolvePath.withArgs("bar", "elm-package.json").returns("./bar/elm-package.json");
      mockExists.withArgs("./foo/elm-package.json").returns(false);
      mockExists.withArgs("./bar/elm-package.json").returns(true);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockCp).to.have.been.calledWith("./bar/elm-package.json", "./foo/elm-package.json");
    });

    it("should not copy the test elm-package.json if the lobo elm-package.json exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-package.json").returns("./foo/elm-package.json");
      mockExists.withArgs("./foo/elm-package.json").returns(true);
      mockExists.withArgs("./bar/elm-package.json").returns(true);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockCp).not.to.have.been.called;
    });

    it("should not copy the test elm-package.json if the test elm-package.json does not exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-package.json").returns("./foo/elm-package.json");
      mockExists.withArgs("./foo/elm-package.json").returns(true);
      mockExists.withArgs("./bar/elm-package.json").returns(false);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockCp).not.to.have.been.called;
    });

    it("should return true if the test elm-package.json is copied", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-package.json").returns("./foo/elm-package.json");
      mockResolvePath.withArgs("bar", "elm-package.json").returns("./bar/elm-package.json");
      mockExists.withArgs("./foo/elm-package.json").returns(false);
      mockExists.withArgs("./bar/elm-package.json").returns(true);


      // act
      let actual = outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(actual).to.equal(true);
    });

    it("should return false if the test elm-package.json is not copied", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm-package.json").returns("./foo/elm-package.json");
      mockExists.withArgs("./foo/elm-package.json").returns(true);
      mockExists.withArgs("./bar/elm-package.json").returns(false);

      // act
      let actual = outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(actual).to.equal(false);
    });
  });

  describe("delete", () => {
    it("should not call fs.unlink when the tempDirectory is undefined", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.delete(undefined, "./.lobo/foo/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should not call fs.unlink when the tempDirectory outside the '.lobo' directory", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.delete("./foo", "./abc/foo/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should not call fs.unlink when the file path is not in the lobo temp directory", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.delete("./.lobo/foo", "./.lobo/abc/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should not call fs.unlink when the file path does not exist and it is a valid temp lobo file", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(false);

      // act
      outputDirectoryManager.delete("./.lobo/foo", "./.lobo/foo/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should call fs.unlink when the file path exists and it is a valid temp lobo file", () => {
      // arrange
      const expected = "./.lobo/foo/bar";
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(true);

      // act
      outputDirectoryManager.delete("./.lobo/foo", expected);

      // assert
      expect(mockUnlinkSync).to.have.been.calledWith(expected);
    });

    it("should log any errors when deleting the file", () => {
      // arrange
      const expected = new Error();
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(true);
      mockUnlinkSync.throws(expected);

      // act
      outputDirectoryManager.delete("./.lobo/foo", "./.lobo/foo/bar");

      // assert
      expect(mockLogger.debug).to.have.been.calledWith(expected);
    });
  });

  describe("sync", () => {
    it("should return a promise that calls configBuildDirectory with the loboDirectory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.configBuildDirectory).to.have.been.calledWith("foo", Sinon.match.any);
      });
    });

    it("should return a promise that calls configBuildDirectory with the test directory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.configBuildDirectory).to.have.been.calledWith(Sinon.match.any, "bar");
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the config", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(context.config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the test directory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the loboElmPackageIsCopy flag", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      let mockConfigBuildDirectory = Sinon.mock();
      mockConfigBuildDirectory.returns(true);
      outputDirectoryManager.configBuildDirectory = mockConfigBuildDirectory;
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true);
      });
    });

    it("should return a promise that calls updateContextForRun with the context", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      let mockUpdateContextForRun = Sinon.mock();
      outputDirectoryManager.updateContextForRun = mockUpdateContextForRun;

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(mockUpdateContextForRun).to.have.been.calledWith(context);
      });
    });

    it("should return a promise that catches and logs any error", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      let mockConfigBuildDirectory = Sinon.mock();
      mockConfigBuildDirectory.throws(new Error("qux"));
      outputDirectoryManager.configBuildDirectory = mockConfigBuildDirectory;
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.catch(() => {
        expect(mockLogger.error).to.have.been.called;
      });
    });
  });

  describe("syncLoboTestElmPackage", () => {
    it("should throw an error if the base package does not exist", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};
      mockHelperRead.returns(undefined);

      // act
      expect(() => {
        outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);
      }).to.throw("Unable to read the test elm-package.json file");
    });

    it("should throw an error if the lobo test elm package does not exist", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.returns(undefined);

      // act
      expect(() => {
        outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);
      }).to.throw("Unable to read the lobo test elm-package.json file.");
    });

    it("should call updateDependencies with the config.testFramework", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith(config.testFramework, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateDependencies with the testElmPackage", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> {sourceDirectories: []};
      mockHelperRead.withArgs("bar").returns(expected);
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateDependencies with the lobo directory", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call updateDependencies with the lobo elmPackage", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> {sourceDirectories: ["qux"]};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected);
    });

    it("should call updateSourceDirectories with the testElmPackageDir", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the testElmPackage", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> {sourceDirectories: []};
      mockHelperRead.withArgs("bar").returns(expected);
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo directory", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo elmPackage", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> {sourceDirectories: ["qux"]};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo elmPackage with empty source directories when copied flag is true", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> {sourceDirectories: ["qux"]};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", true);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
      expect(expected.sourceDirectories.length).to.equal(0);
    });

    it("should call updateSourceDirectories with the testFramework sourceDirectories", () => {
      // arrange
      let expected = ["abc"];
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: expected}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, expected);
    });
  });

  describe("updateContextForRun", () => {
    it("should call tmp.dirSync with dir as config.loboDirectory", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}};
      mockTmpDirSync.returns({name: "bar"});
      mockResolvePath.returns("abc");

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(mockTmpDirSync).to.have.been.calledWith(Sinon.match({dir: "abc"}));
    });

    it("should call tmp.dirSync with prefix as 'lobo-", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}};
      mockTmpDirSync.returns({name: "bar"});

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(mockTmpDirSync).to.have.been.calledWith(Sinon.match({prefix: "lobo-"}));
    });

    it("should set the context.tempDirectory with path returned from tmp.dirSync", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}};
      mockTmpDirSync.returns({name: "bar"});

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(context.tempDirectory).to.equal("bar");
    });

    it("should set the context.buildOutputFilePath with 'UnitTest.js' in the tempDirectory", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo", testMainElm: "baz"}};
      mockTmpDirSync.returns({name: "bar"});
      mockJoin.callsFake(path.join);

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(context.buildOutputFilePath).to.equal("bar/UnitTest.js");
    });

    it("should set the context.testSuiteOutputFilePath with testMainElm in the tempDirectory", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo", testMainElm: "baz"}};
      mockTmpDirSync.returns({name: "bar"});
      mockJoin.callsFake(path.join);

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(context.testSuiteOutputFilePath).to.equal("bar/baz");
    });
  });


  describe("updateDependencies", () => {
    it("should call helper.updateDependencies with the specified testFramework", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(testFramework, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencies with the specified baseElmPackage", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencies with the specified testElmPackageDir", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencies with the specified testElmPackage", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any);
    });

    it("should call helper.updateDependencies with a callback", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.func);
    });

    it("should not call updateAction when there is no difference", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(updateAction).not.to.have.been.called;
    });

    it("should call updateAction when there is a difference", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {name: "bar"}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: {source: "abc"}, sourceDirectories: []};
      let testPackageJson = <ElmPackageJson>{dependencies: {test: "def"}, sourceDirectories: []};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["abc"], updateAction);
      };

      // act
      outputDirectoryManager.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(updateAction).to.have.been.calledWith();
    });
  });

  describe("updateSourceDirectories", () => {
    it("should call helper.updateSourceDirectories with the specified baseElmPackgaeDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified baseElmPackage", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified testElmPackageDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified testElmPackage", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with test framework source directories list", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, ["foo"], Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with a callback", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.func);
    });

    it("should not call updateAction when there is no difference", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(updateAction).not.to.have.been.called;
    });

    it("should call updateAction when there is a difference", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["abc"], updateAction);
      };

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(updateAction).to.have.been.calledWith();
    });
  });
});
