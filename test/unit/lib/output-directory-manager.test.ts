"use strict";

import * as path from "path";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {createOutputDirectoryManager, OutputDirectoryManager, OutputDirectoryManagerImp} from "../../../lib/output-directory-manager";
import {ExecutionContext} from "../../../lib/plugin";

const expect = chai.expect;
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
    outputDirectoryManager = new rewiredImp(mockLogger);
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
      const actual: OutputDirectoryManager = createOutputDirectoryManager();

      // assert
      expect(actual).to.exist;
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

  describe("ensureBuildDirectory", () => {
    it("should not call mkdir when the directory already exists", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}};
      mockExists.returns(true);

      // act
      outputDirectoryManager.ensureBuildDirectory(context);

      // assert
      expect(mockMkDir).not.to.have.been.called;
    });

    it("should call mkdir with the loboDirectory when the directory exists", () => {
      // arrange
      const expected = "foo";
      const context = <ExecutionContext> {config: {loboDirectory: expected}};
      mockExists.returns(false);

      // act
      outputDirectoryManager.ensureBuildDirectory(context);

      // assert
      expect(mockMkDir).to.have.been.calledWith(expected);
    });

  });


  describe("prepare", () => {
    it("should return a promise that calls ensureBuildDirectory with the context", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.ensureBuildDirectory = Sinon.spy();
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      const actual = outputDirectoryManager.prepare(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.ensureBuildDirectory).to.have.been.calledWith(context);
      });
    });

    it("should return a promise that calls updateContextForRun with the context", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      outputDirectoryManager.ensureBuildDirectory = Sinon.spy();
      const mockUpdateContextForRun = Sinon.mock();
      outputDirectoryManager.updateContextForRun = mockUpdateContextForRun;

      // act
      const actual = outputDirectoryManager.prepare(context);

      // assert
      return actual.then(() => {
        expect(mockUpdateContextForRun).to.have.been.calledWith(context);
      });
    });

    it("should return a promise that catches and logs any error", () => {
      // arrange
      const context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar"};
      const mockEnsureBuildDirectory = Sinon.mock();
      mockEnsureBuildDirectory.throws(new Error("qux"));
      outputDirectoryManager.ensureBuildDirectory = mockEnsureBuildDirectory;
      outputDirectoryManager.updateContextForRun = Sinon.spy();

      // act
      const actual = outputDirectoryManager.prepare(context);

      // assert
      return actual.catch(() => {
        expect(mockLogger.error).to.have.been.called;
      });
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
});
