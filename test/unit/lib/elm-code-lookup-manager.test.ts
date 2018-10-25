"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {Stats} from "fs";
import {createElmCodeLookupManager, ElmCodeLookupManager, ElmCodeLookupManagerImp, FileInfo} from "../../../lib/elm-code-lookup-manager";
import {
  ElmCodeInfo,
  ElmCodeLookup,
  ElmFunctionDependency,
  ElmFunctionNode,
  ElmNodeType,
  ExecutionContext,
  LoboConfig
} from "../../../lib/plugin";
import {ElmParser} from "../../../lib/elm-parser";
import {Util} from "../../../lib/util";
import {createElmNodeHelper, ElmNodeHelper} from "../../../lib/elm-node-helper";
import rewire = require("rewire");

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib test-suite-generator", () => {
  let RewiredElmCodeLookupManager = rewire("../../../lib/elm-code-lookup-manager");
  let manager: ElmCodeLookupManagerImp;
  let mockBasename: Sinon.SinonStub;
  let mockJoin: Sinon.SinonStub;
  let mockNodeHelper: ElmNodeHelper;
  let mockLogger: Logger;
  let mockLstat: Sinon.SinonStub;
  let mockParse: Sinon.SinonStub;
  let mockParser: ElmParser;
  let mockReadDirSync: Sinon.SinonStub;
  let mockReadFileSync: Sinon.SinonStub;
  let mockRealPath: Sinon.SinonStub;
  let mockRelativePath: Sinon.SinonStub;
  let mockResolveDir: Sinon.SinonStub;
  let mockResolvePath: Sinon.SinonStub;
  let mockUtil: Util;
  let revert: () => void;

  beforeEach(() => {
    mockBasename = Sinon.stub();
    mockJoin = Sinon.stub();
    mockLstat = Sinon.stub();
    mockReadDirSync = Sinon.stub();
    mockReadFileSync = Sinon.stub();
    mockRealPath = Sinon.stub();
    mockRelativePath = Sinon.stub();
    mockResolvePath = Sinon.stub();

    revert = RewiredElmCodeLookupManager.__set__({
      fs: {lstatSync: mockLstat, readFileSync: mockReadFileSync, readdirSync: mockReadDirSync, realpathSync: mockRealPath},
      path: {basename: mockBasename, join: mockJoin, relative: mockRelativePath, resolve: mockResolvePath}
    });
    let rewiredImp = RewiredElmCodeLookupManager.__get__("ElmCodeLookupManagerImp");

    mockNodeHelper = createElmNodeHelper();

    mockLogger = <Logger><{}>Sinon.mock();
    mockLogger.debug = Sinon.stub();
    mockLogger.info = Sinon.stub();
    mockLogger.error = Sinon.stub();

    mockParse = Sinon.stub();
    mockParser = <ElmParser> {parse: mockParse};

    mockResolveDir = Sinon.stub();
    mockUtil = <Util><{}>{resolveDir: mockResolveDir};

    manager = new rewiredImp(mockNodeHelper, mockParser, mockLogger, mockUtil);
  });

  afterEach(() => {
    revert();
  });

  describe("createElmCodeLookupManager", () => {
    it("should return test suite generator", () => {
      // act
      let actual: ElmCodeLookupManager = createElmCodeLookupManager();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("findFiles", () => {
    it("should return empty list when the supplied item is not a matching file", () => {
      // arrange
      let mockStats = <Stats> {};
      mockStats.isDirectory = () => false;
      mockLstat.returns(mockStats);

      // act
      let actual = manager.findFiles("foo.exe", ".txt", true);

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return only the supplied item when it is a matching file", () => {
      // arrange
      let mockStats = <Stats> {};
      mockStats.isDirectory = () => false;
      mockLstat.returns(mockStats);

      // act
      let actual = manager.findFiles("foo.txt", ".txt", true);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({filePath: "foo.txt", isTestFile: true, stats: mockStats});
    });

    it("should return no files when the supplied path is elm-stuff directory", () => {
      // arrange
      mockLstat.onFirstCall().returns({isDirectory: () => true});
      let mockStats = <Stats> {};
      mockLstat.returns(mockStats);
      mockReadDirSync.onFirstCall().returns(["foo.txt"]);

      // act
      let actual = manager.findFiles("./bar/elm-stuff", ".txt", true);

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return matching files in the supplied directory", () => {
      // arrange
      mockJoin.callsFake((x, y) => x + "/" + y);
      let revertPath = RewiredElmCodeLookupManager.__with__({path: {join: mockJoin}});

      mockLstat.onFirstCall().returns({isDirectory: () => true});
      let mockStats = <Stats> {};
      mockStats.isDirectory = () => false;
      mockLstat.returns(mockStats);
      mockReadDirSync.onFirstCall().returns(["foo.txt", "bar.exe", "baz.txt"]);

      // act
      let actual: FileInfo[] = [];
      revertPath(() => actual = manager.findFiles("abc", ".txt", true));

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({filePath: "abc/foo.txt", isTestFile: true, stats: mockStats});
      expect(actual[1]).to.deep.equal({filePath: "abc/baz.txt", isTestFile: true, stats: mockStats});
    });

    it("should return matching files recursively in the supplied directory", () => {
      // arrange
      mockJoin.callsFake((x, y) => x + "/" + y);
      mockLstat.onFirstCall().returns({isDirectory: () => true});
      mockLstat.onSecondCall().returns({isDirectory: () => true});
      let mockStats = <Stats> {};
      mockStats.isDirectory = () => false;
      mockLstat.returns(mockStats);
      mockReadDirSync.onFirstCall().returns(["foo", "bar.exe", "baz.txt"]);
      mockReadDirSync.onSecondCall().returns(["qux.txt"]);

      // act
      let actual = manager.findFiles("abc", ".txt", true);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({filePath: "abc/foo/qux.txt", isTestFile: true, stats: mockStats});
      expect(actual[1]).to.deep.equal({filePath: "abc/baz.txt", isTestFile: true, stats: mockStats});
    });
  });

  describe("sync", () => {
    it("should return a promise that calls updateTests with the supplied context", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      let mockUpdateTests = Sinon.stub();
      mockUpdateTests.resolves({});
      manager.updateTests = mockUpdateTests;

      // act
      let actual = manager.sync(expected);

      // assert
      return actual.then(() => {
        expect(manager.updateTests).to.have.been.calledWith(expected);
      });
    });

    it("should return a promise that returns the context from updateTests", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      let mockUpdateTests = Sinon.stub();
      mockUpdateTests.resolves(expected);
      manager.updateTests = mockUpdateTests;

      // act
      let actual = manager.sync(<ExecutionContext> {});

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result).to.equal(expected);
      });
    });
  });

  describe("syncHasDebugUsage", () => {
    it("should update hasDebugUsage with the result from calling containsDebugModuleUsage", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}, codeLookup: {}, hasDebugUsage: false};
      const mockContainsDebugModuleUsage = Sinon.stub();
      mockContainsDebugModuleUsage.returns(true);
      manager.containsDebugModuleUsage = mockContainsDebugModuleUsage;

      // act
      manager.syncHasDebugUsage(expected);

      // assert
      expect(mockContainsDebugModuleUsage).to.have.been.calledWith(expected.codeLookup);
      expect(expected.hasDebugUsage).to.be.true;
    });
  });

  describe("containsDebugModuleUsage", () => {
    it("should be false when there are empty codeLookup", () => {
      // arrange
      const codeLookup = {};

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when there are no own codeInfo items", () => {
      // arrange
      const parentCodeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: {}}};
      const codeLookup = Object.create(parentCodeLookup);

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when the module node is undefined", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: undefined}};

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when the module node has undefined children", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: { children: undefined}}};

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when there are no function nodes in the module", () => {
      // arrange
      const children = <ElmFunctionNode[]> [{name: "foo", nodeType: ElmNodeType.Type}];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: { children }}};

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when there are no debug usages", () => {
      // arrange
      const dependencies = <ElmFunctionDependency[]> [{typeInfo: {moduleName: "Bar"}}];
      const children = <ElmFunctionNode[]> [{name: "foo", nodeType: ElmNodeType.TypedModuleFunction, dependencies}];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: { children }}};

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.false;
    });

    it("should be true when there are debug usages", () => {
      // arrange
      const dependencies = <ElmFunctionDependency[]> [{typeInfo: {moduleName: "Debug"}}];
      const children = <ElmFunctionNode[]> [{name: "foo", nodeType: ElmNodeType.TypedModuleFunction, dependencies}];
      const codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {moduleNode: { children }}};

      // act
      const actual = manager.containsDebugModuleUsage(codeLookup);

      // assert
      expect(actual).to.be.true;
    });
  });


  describe("syncElmCodeLookupWithFileChanges", () => {
    it("should return an empty lookup when there are no files", () => {
      // arrange
      let lookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};

      // act
      let actual = manager.syncElmCodeLookupWithFileChanges(lookup, [], "baz");

      // assert
      expect(actual).to.be.empty;
    });

    it("should return an lookup with existing values there are no file changes", () => {
      // arrange
      let lookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      lookup.foo.lastModified = new Date("2018-01-02");
      let updatedInfo = <FileInfo> {filePath: "foo", stats: {}};
      updatedInfo.stats.mtime = new Date("2018-01-02");

      // act
      let actual = manager.syncElmCodeLookupWithFileChanges(lookup, [updatedInfo], "baz");

      // assert
      expect(actual.foo).to.equal(lookup.foo);
    });

    it("should return an updated lookup with updated values from toElmCodeInfo when there are file changes", () => {
      // arrange
      let lookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      lookup.foo.lastModified = new Date("2018-01-02");
      let updatedInfo = <FileInfo> {filePath: "foo", stats: {}};
      updatedInfo.stats.mtime = new Date("2018-01-03");
      let mockToElmCodeInfo = Sinon.stub();
      let expected = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      expected.foo.lastModified = new Date("2018-02-04");
      mockToElmCodeInfo.returns(expected);
      manager.toElmCodeInfo = mockToElmCodeInfo;

      // act
      let actual = manager.syncElmCodeLookupWithFileChanges(lookup, [updatedInfo], "baz");

      // assert
      expect(actual.foo).to.equal(expected);
    });

    it("should call toElmCodeInfo with the testFrameworkModuleName", () => {
      // arrange
      let lookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      lookup.foo.lastModified = new Date("2018-01-02");
      let updatedInfo = <FileInfo> {filePath: "foo", stats: {}};
      updatedInfo.stats.mtime = new Date("2018-01-03");
      manager.toElmCodeInfo = Sinon.spy();

      // act
      manager.syncElmCodeLookupWithFileChanges(lookup, [updatedInfo], "baz");

      // assert
      expect(manager.toElmCodeInfo).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should call toElmCodeInfo with updated pathInfo when there are file changes", () => {
      // arrange
      let lookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      lookup.foo.lastModified = new Date("2018-01-02");
      let updatedInfo = <FileInfo> {filePath: "foo", stats: {}};
      updatedInfo.stats.mtime = new Date("2018-01-03");
      manager.toElmCodeInfo = Sinon.spy();

      // act
      manager.syncElmCodeLookupWithFileChanges(lookup, [updatedInfo], "baz");

      // assert
      expect(manager.toElmCodeInfo).to.have.been.calledWith(Sinon.match.any, updatedInfo);
    });
  });

  describe("toElmCodeInfo", () => {
    it("should call parser.parse with the pathIno.filePath", () => {
      // arrange
      let info = <FileInfo> {filePath: "foo", stats: {}};

      // act
      manager.toElmCodeInfo("baz", info);

      // assert
      expect(mockParser.parse).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call parser.parse with the testFrameworkElmModuleName", () => {
      // arrange
      let info = <FileInfo> {filePath: "foo", stats: {}};

      // act
      manager.toElmCodeInfo("baz", info);

      // assert
      expect(mockParser.parse).to.have.been.calledWith(Sinon.match.any, "baz");
    });

    it("should return info with fileName from file info", () => {
      // arrange
      let info = <FileInfo> {filePath: "foo/bar.txt", stats: {}};
      mockBasename.returns("bar.txt");

      // act
      let actual = manager.toElmCodeInfo("baz", info);

      // assert
      expect(actual.fileName).to.equal("bar.txt");
    });

    it("should return info with filePath from file info", () => {
      // arrange
      let info = <FileInfo> {filePath: "foo/bar.txt", stats: {}};
      mockBasename.returns("bar.txt");

      // act
      let actual = manager.toElmCodeInfo("baz", info);

      // assert
      expect(actual.filePath).to.equal(info.filePath);
    });

    it("should return info with isTestFile to be true", () => {
      // arrange
      let info = <FileInfo> {filePath: "foo/bar.txt", stats: {}};
      mockBasename.returns("bar.txt");

      // act
      let actual = manager.toElmCodeInfo("baz", info);

      // assert
      expect(actual.isTestFile).to.equal(true);
    });

    it("should return info with lastModified from file info", () => {
      // arrange
      let info = <FileInfo> {filePath: "foo/bar.txt", stats: {}};
      info.stats.mtime = new Date("2018-01-03");
      mockBasename.returns("bar.txt");

      // act
      let actual = manager.toElmCodeInfo("baz", info);

      // assert
      expect(actual.lastModified).to.equal(info.stats.mtime);
    });
  });

  describe("updateTests", () => {
    it("should return a promise that calls findFiles with the testDirectory", () => {
      // arrange
      let context = <ExecutionContext> {testDirectory: "foo"};
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      manager.findFiles = Sinon.spy();
      manager.syncElmCodeLookupWithFileChanges = Sinon.stub();

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then(() => {
        expect(manager.findFiles).to.have.been.calledWith(context.testDirectory, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls findFiles with file type '.elm'", () => {
      // arrange
      let context = <ExecutionContext> {testDirectory: "foo"};
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      manager.findFiles = Sinon.spy();
      manager.syncElmCodeLookupWithFileChanges = Sinon.stub();

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then(() => {
        expect(manager.findFiles).to.have.been.calledWith(Sinon.match.any, ".elm", Sinon.match.any);
      });
    });

    it("should return a promise that calls findFiles with isTestFile true", () => {
      // arrange
      let context = <ExecutionContext> {testDirectory: "foo"};
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      manager.findFiles = Sinon.spy();
      manager.syncElmCodeLookupWithFileChanges = Sinon.stub();

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then(() => {
        expect(manager.findFiles).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true);
      });
    });

    it("should return a promise that calls syncElmCodeLookupWithFileChanges with the context.codeLookup", () => {
      // arrange
      let expected = {foo: <ElmCodeInfo> {}};
      let context = <ExecutionContext> {testDirectory: null};
      context.codeLookup = expected;
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      let mockFindFiles = Sinon.stub();
      mockFindFiles.returns([]);
      manager.findFiles = mockFindFiles;
      manager.syncElmCodeLookupWithFileChanges = Sinon.spy();

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then(() => {
        expect(manager.syncElmCodeLookupWithFileChanges)
          .to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls syncElmCodeLookupWithFileChanges with the files from findFiles", () => {
      // arrange
      let expected = ["foo", "bar"];
      let context = <ExecutionContext> {testDirectory: null};
      context.codeLookup = {};
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      let mockFindFiles = Sinon.stub();
      mockFindFiles.returns(expected);
      manager.findFiles = mockFindFiles;
      manager.syncElmCodeLookupWithFileChanges = Sinon.spy();

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then(() => {
        expect(manager.syncElmCodeLookupWithFileChanges)
          .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should return a promise that calls syncElmCodeLookupWithFileChanges with the testFrameworkModule name from context.config", () => {
      // arrange
      let expected = ["foo", "bar"];
      let context = <ExecutionContext> {testDirectory: null};
      context.codeLookup = {};
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      let mockFindFiles = Sinon.stub();
      mockFindFiles.returns(expected);
      manager.findFiles = mockFindFiles;
      manager.syncElmCodeLookupWithFileChanges = Sinon.spy();

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then(() => {
        expect(manager.syncElmCodeLookupWithFileChanges)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz");
      });
    });

    it("should return a promise that returns the updated context", () => {
      // arrange
      let expected = <ExecutionContext> {testDirectory: "foo"};
      let codeLookup = {foo: <ElmCodeInfo>{}};
      expected.codeLookup = codeLookup;
      let config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      expected.config = config;
      let context = <ExecutionContext> {testDirectory: "foo"};
      context.codeLookup = {};
      context.config = config;
      manager.findFiles = Sinon.stub();
      let mockSyncElmCodeLookup = Sinon.stub();
      mockSyncElmCodeLookup.returns(codeLookup);
      manager.syncElmCodeLookupWithFileChanges = mockSyncElmCodeLookup;
      mockResolveDir.returns("/foo");
      mockJoin.returns("/foo/bar");

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result).to.deep.equal(expected);
      });
    });

    it("should return a promise that catches and logs any errors", () => {
      // arrange
      let context = <ExecutionContext> {testDirectory: "foo"};
      context.codeLookup = {};
      context.config = <LoboConfig> { testFramework: { testFrameworkElmModuleName: () => "baz"} };
      let mockFindFiles = Sinon.stub();
      mockFindFiles.throws(new Error("qux"));
      manager.findFiles = mockFindFiles;

      // act
      let actual = manager.updateTests(context);

      // assert
      return actual.catch(() => {
        expect(mockLogger.error).to.have.been.called;
      });
    });
  });
});
