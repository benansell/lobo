"use strict";

import * as path from "path";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {createOutputDirectoryManager, OutputDirectoryManager, OutputDirectoryManagerImp} from "../../../lib/output-directory-manager";
import {
  ApplicationDependencies,
  ExecutionContext,
  LoboConfig, VersionSpecification,
  VersionSpecificationExact, VersionSpecificationInvalid
} from "../../../lib/plugin";
import {ElmPackageHelper, ElmJson, UpdateDependenciesCallback, UpdateSourceDirectoriesCallback} from "../../../lib/elm-package-helper";

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
  let mockRmDirSync: Sinon.SinonStub;
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
    mockRmDirSync = Sinon.stub();
    mockTmpDirSync = Sinon.stub();
    mockUnlinkSync = Sinon.stub();

    revert = RewiredOutputDirectoryManager.__set__({
      fs: {existsSync: mockExists, rmdirSync: mockRmDirSync, unlinkSync: mockUnlinkSync},
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
      updateDependencyVersions: Sinon.stub(),
      updateSourceDirectories: mockHelperUpdateSourceDirectories
    };

    outputDirectoryManager = new rewiredImp(mockHelper, mockLogger);
  });

  afterEach(() => {
    revert();
  });

  describe("cleanup", () => {
    it("should not deleteTempFile any files when the config.noCleanup is true", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {config: {noCleanup: true}});

      // assert
      expect(outputDirectoryManager.deleteTempFile).not.to.have.been.called;
    });

    it("should not deleteTempFile any files when the tempDirectory is undefined", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.deleteTempFile).not.to.have.been.called;
    });

    it("should call deleteTempFile with tempDir when tempDirectory and buildOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", buildOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.deleteTempFile).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call deleteTempFile with buildOutputFilePath when tempDirectory and buildOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", buildOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.deleteTempFile).to.have.been.calledWith(Sinon.match.any, "bar");
    });

    it("should call deleteTempFile with tempDir when tempDirectory and testSuiteOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", testSuiteOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.deleteTempFile).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call deleteTempFile with testSuiteOutputFilePath when tempDirectory and testSuiteOutputFilePath are defined", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", testSuiteOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.deleteTempFile).to.have.been.calledWith(Sinon.match.any, "bar");
    });

    it("should call deleteTempDir with tempDirectory when tempDirectory is defined and noCleanUp is false", () => {
      // arrange
      outputDirectoryManager.deleteTempFile = Sinon.stub();
      outputDirectoryManager.deleteTempDir = Sinon.stub();

      // act
      outputDirectoryManager.cleanup(<ExecutionContext> {tempDirectory: "foo", testSuiteOutputFilePath: "bar", config: {noCleanup: false}});

      // assert
      expect(outputDirectoryManager.deleteTempDir).to.have.been.calledWith("foo");
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

    it("should not create a link to the elm-stuff directory if the app elm-stuff does not exists", () => {
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

    it("should copy the test elm.json if the lobo elm.json does not exist", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm.json").returns("./foo/elm.json");
      mockResolvePath.withArgs("bar", "elm.json").returns("./bar/elm.json");
      mockExists.withArgs("./foo/elm.json").returns(false);
      mockExists.withArgs("./bar/elm.json").returns(true);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockCp).to.have.been.calledWith("./bar/elm.json", "./foo/elm.json");
    });

    it("should not copy the test elm.json if the lobo elm.json exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm.json").returns("./foo/elm.json");
      mockExists.withArgs("./foo/elm.json").returns(true);
      mockExists.withArgs("./bar/elm.json").returns(true);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockCp).not.to.have.been.called;
    });

    it("should not copy the test elm.json if the test elm.json does not exists", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm.json").returns("./foo/elm.json");
      mockExists.withArgs("./foo/elm.json").returns(true);
      mockExists.withArgs("./bar/elm.json").returns(false);

      // act
      outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(mockCp).not.to.have.been.called;
    });

    it("should return true if the test elm.json is copied", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm.json").returns("./foo/elm.json");
      mockResolvePath.withArgs("bar", "elm.json").returns("./bar/elm.json");
      mockExists.withArgs("./foo/elm.json").returns(false);
      mockExists.withArgs("./bar/elm.json").returns(true);


      // act
      let actual = outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(actual).to.equal(true);
    });

    it("should return false if the test elm.json is not copied", () => {
      // arrange
      mockResolvePath.withArgs("foo", "elm.json").returns("./foo/elm.json");
      mockExists.withArgs("./foo/elm.json").returns(true);
      mockExists.withArgs("./bar/elm.json").returns(false);

      // act
      let actual = outputDirectoryManager.configBuildDirectory("foo", "bar");

      // assert
      expect(actual).to.equal(false);
    });
  });

  describe("deleteTempDir", () => {
    it("should not call fs.rmdir when the tempDirectory is undefined", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.deleteTempDir(undefined);

      // assert
      expect(mockRmDirSync).not.to.have.been.called;
    });

    it("should not call fs.rmdir when the tempDirectory outside the '.lobo' directory", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.deleteTempDir("./foo");

      // assert
      expect(mockRmDirSync).not.to.have.been.called;
    });

    it("should not call fs.rmdir when the tempDirectory does not exist and it is a valid temp directory", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(false);

      // act
      outputDirectoryManager.deleteTempDir("./.lobo/foo");

      // assert
      expect(mockRmDirSync).not.to.have.been.called;
    });

    it("should call fs.rmdir when the directory exists and it is a valid temp directory", () => {
      // arrange
      const expected = "./.lobo/foo";
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(true);

      // act
      outputDirectoryManager.deleteTempDir(expected);

      // assert
      expect(mockRmDirSync).to.have.been.calledWith(expected);
    });

    it("should log any errors when deleting the directory", () => {
      // arrange
      const expected = new Error();
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(true);
      mockRmDirSync.throws(expected);

      // act
      outputDirectoryManager.deleteTempDir("./.lobo/foo");

      // assert
      expect(mockLogger.debug).to.have.been.calledWith(expected);
    });
  });

  describe("deleteTempFile", () => {
    it("should not call fs.unlink when the tempDirectory is undefined", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.deleteTempFile(undefined, "./.lobo/foo/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should not call fs.unlink when the tempDirectory outside the '.lobo' directory", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.deleteTempFile("./foo", "./abc/foo/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should not call fs.unlink when the file path is not in the lobo temp directory", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);

      // act
      outputDirectoryManager.deleteTempFile("./.lobo/foo", "./.lobo/abc/bar");

      // assert
      expect(mockUnlinkSync).not.to.have.been.called;
    });

    it("should not call fs.unlink when the file path does not exist and it is a valid temp lobo file", () => {
      // arrange
      mockBasename.callsFake(path.basename);
      mockDirname.callsFake(path.dirname);
      mockExists.returns(false);

      // act
      outputDirectoryManager.deleteTempFile("./.lobo/foo", "./.lobo/foo/bar");

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
      outputDirectoryManager.deleteTempFile("./.lobo/foo", expected);

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
      outputDirectoryManager.deleteTempFile("./.lobo/foo", "./.lobo/foo/bar");

      // assert
      expect(mockLogger.debug).to.have.been.calledWith(expected);
    });
  });

  describe("sync", () => {
    it("should return a promise that calls configBuildDirectory with the loboDirectory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmJson = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.configBuildDirectory).to.have.been.calledWith("foo", Sinon.match.any);
      });
    });

    it("should return a promise that calls configBuildDirectory with the app directory", () => {
      // arrange
      let context = <ExecutionContext> {config: {appDirectory: "bar", loboDirectory: "foo"}};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmJson = Sinon.spy();
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
      outputDirectoryManager.syncLoboTestElmJson = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmJson)
          .to.have.been.calledWith(context.config, Sinon.match.any);
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the loboElmPackageIsCopy flag", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      let mockConfigBuildDirectory = Sinon.mock();
      mockConfigBuildDirectory.returns(true);
      outputDirectoryManager.configBuildDirectory = mockConfigBuildDirectory;
      outputDirectoryManager.syncLoboTestElmJson = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmJson)
          .to.have.been.calledWith(Sinon.match.any, true);
      });
    });

    it("should return a promise that calls updateContextForRun with the context", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmJson = Sinon.spy();
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
      outputDirectoryManager.syncLoboTestElmJson = Sinon.spy();
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
    it("should throw an error if the app elm json does not exist", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};
      mockHelperRead.returns(undefined);

      // act
      expect(() => {
        outputDirectoryManager.syncLoboTestElmJson(config, false);
      }).to.throw("Unable to read the app elm.json file");
    });

    it("should throw an error if the lobo test elm package does not exist", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo"};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.returns(undefined);

      // act
      expect(() => {
        outputDirectoryManager.syncLoboTestElmJson(config, false);
      }).to.throw("Unable to read the lobo test elm.json file.");
    });

    it("should call updateDependencies with the loboDirectory", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call updateDependencies with the loboElmJson", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmJson> {sourceDirectories: []};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call updateDependencies with the appElmJson", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmJson> {sourceDirectories: ["qux"]};
      mockHelperRead.withArgs("bar").returns(expected);
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateDependencies = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected);
    });

    it("should call updateSourceDirectories with the loboDir", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the loboElmPackage", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmJson> {sourceDirectories: []};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the appDir", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the appElmJson", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmJson> {sourceDirectories: ["qux"]};
      mockHelperRead.withArgs("bar").returns(expected);
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo elmPackage with empty source directories when copied flag is true", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmJson> {sourceDirectories: ["qux"]};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, true);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any);
      expect(expected.sourceDirectories.length).to.equal(0);
    });

    it("should call updateSourceDirectories with the testFramework sourceDirectories", () => {
      // arrange
      let expected = ["abc"];
      let config = <LoboConfig> {appDirectory: "bar", loboDirectory: "foo", testFramework: {config: {sourceDirectories: expected}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmJson(config, false);

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
      mockJoin.callsFake((...args) => args.join("/"));

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(context.buildOutputFilePath).to.equal("bar/UnitTest.js");
    });

    it("should set the context.testSuiteOutputFilePath with testMainElm in the tempDirectory", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo", testMainElm: "baz"}};
      mockTmpDirSync.returns({name: "bar"});
      mockJoin.callsFake((...args) => args.join("/"));

      // act
      outputDirectoryManager.updateContextForRun(context);

      // assert
      expect(context.testSuiteOutputFilePath).to.equal("bar/baz");
    });
  });

  describe("updateDependencies", () => {
    it("should call helper.updateDependencies with the specified loboDir", () => {
      // arrange
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies("baz", <ElmJson>{}, <ElmJson>{});

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith("baz", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencies with the specified loboElmJson", () => {
      // arrange
      const expected = <ElmJson>{};
      expected.sourceDirectories = ["src"];
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies("baz", expected, <ElmJson>{});

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencies with the specified appElmJson.appDependecies", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      const appElmJson = <ElmJson>{};
      appElmJson.srcDependencies = expected;
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies("baz", <ElmJson>{} , appElmJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencies with the specified appElmJson.testDependecies", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      const appElmJson = <ElmJson>{};
      appElmJson.testDependencies = expected;
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencies("baz", <ElmJson>{} , appElmJson);

      // assert
      expect(mockHelper.updateDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should not call updateAction when there is no difference", () => {
      // arrange
      let sourcePackageJson = <ElmJson>{};
      sourcePackageJson.sourceDirectories = ["src"];
      let loboPackageJson = <ElmJson>{};
      loboPackageJson.sourceDirectories = ["test"];
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      };

      // act
      outputDirectoryManager.updateDependencies("baz", loboPackageJson, sourcePackageJson);

      // assert
      expect(updateAction).not.to.have.been.called;
    });

    it("should call updateAction when there is a difference", () => {
      // arrange
      let sourcePackageJson = <ElmJson>{};
      sourcePackageJson.sourceDirectories = ["src"];
      let loboPackageJson = <ElmJson>{};
      loboPackageJson.sourceDirectories = ["test"];
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        const diff = {"abc": <VersionSpecificationExact> {}};
        updateCallback(diff, updateAction);
      };

      // act
      outputDirectoryManager.updateDependencies("baz", loboPackageJson, sourcePackageJson);

      // assert
      expect(updateAction).to.have.been.calledWith();
    });
  });

  describe("updateDependencyVersions", () => {
    it("should call helper.updateDependencyVersions with the specified loboDir", () => {
      // arrange
      let updateAction = Sinon.stub();
      mockHelper.updateDependencyVersions = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencyVersions("baz", <ElmJson>{}, <ElmJson>{});

      // assert
      expect(mockHelper.updateDependencyVersions)
        .to.have.been.calledWith("baz", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencyVersions with the specified loboElmJson", () => {
      // arrange
      const expected = <ElmJson>{};
      expected.sourceDirectories = ["src"];
      let updateAction = Sinon.stub();
      mockHelper.updateDependencyVersions = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencyVersions("baz", expected, <ElmJson>{});

      // assert
      expect(mockHelper.updateDependencyVersions)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencyVersions with the specified appElmJson.appDependecies", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      const appElmJson = <ElmJson>{};
      appElmJson.srcDependencies = expected;
      let updateAction = Sinon.stub();
      mockHelper.updateDependencyVersions = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencyVersions("baz", <ElmJson>{} , appElmJson);

      // assert
      expect(mockHelper.updateDependencyVersions)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateDependencyVersions with the specified appElmJson.testDependecies", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      const appElmJson = <ElmJson>{};
      appElmJson.testDependencies = expected;
      let updateAction = Sinon.stub();
      mockHelper.updateDependencyVersions = Sinon.spy((...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      });

      // act
      outputDirectoryManager.updateDependencyVersions("baz", <ElmJson>{} , appElmJson);

      // assert
      expect(mockHelper.updateDependencyVersions)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should not call updateAction when there is no difference", () => {
      // arrange
      let sourcePackageJson = <ElmJson>{};
      sourcePackageJson.sourceDirectories = ["src"];
      let loboPackageJson = <ElmJson>{};
      loboPackageJson.sourceDirectories = ["test"];
      let updateAction = Sinon.stub();
      mockHelper.updateDependencyVersions = (...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        updateCallback({}, updateAction);
      };

      // act
      outputDirectoryManager.updateDependencyVersions("baz", loboPackageJson, sourcePackageJson);

      // assert
      expect(updateAction).not.to.have.been.called;
    });

    it("should call updateAction when there is a difference", () => {
      // arrange
      let sourcePackageJson = <ElmJson>{};
      sourcePackageJson.sourceDirectories = ["src"];
      let loboPackageJson = <ElmJson>{};
      loboPackageJson.sourceDirectories = ["test"];
      let updateAction = Sinon.stub();
      mockHelper.updateDependencyVersions = (...args) => {
        const updateCallback: UpdateDependenciesCallback = args[args.length - 1];
        const diff = {"abc": <VersionSpecificationExact> {}};
        updateCallback(diff, updateAction);
      };

      // act
      outputDirectoryManager.updateDependencyVersions("baz", loboPackageJson, sourcePackageJson);

      // assert
      expect(updateAction).to.have.been.calledWith();
    });
  });

  describe("updateSourceDirectories", () => {
    it("should call helper.updateSourceDirectories with the specified loboDir", () => {
      // arrange
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", <ElmJson>{}, "baz", <ElmJson>{}, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified loboElmJson", () => {
      // arrange
      let expected = <ElmJson>{};
      expected.sourceDirectories = ["src"];
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", expected, "baz", <ElmJson>{}, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified appDir", () => {
      // arrange
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", <ElmJson>{}, "baz", <ElmJson>{}, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified appElmJson.sourceDirectories", () => {
      // arrange
      let expected = <ElmJson>{};
      expected.sourceDirectories = ["src"];
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", <ElmJson>{}, "baz", expected, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected.sourceDirectories, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with test framework source directories list", () => {
      // arrange
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", <ElmJson>{}, "baz", <ElmJson>{}, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, ["foo"], Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with a callback", () => {
      // arrange
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", <ElmJson>{}, "baz", <ElmJson>{}, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.func);
    });

    it("should not call updateAction when there is no difference", () => {
      // arrange
      let sourcePackageJson = <ElmJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(updateAction).not.to.have.been.called;
    });

    it("should call updateAction when there is a difference", () => {
      // arrange
      let sourcePackageJson = <ElmJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateSourceDirectoriesCallback = args[args.length - 1];
        updateCallback(["abc"], updateAction);
      };

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"]);

      // assert
      expect(updateAction).to.have.been.calledWith();
    });
  });
});
