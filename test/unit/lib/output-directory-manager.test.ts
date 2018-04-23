"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {createOutputDirectoryManager, OutputDirectoryManager, OutputDirectoryManagerImp} from "../../../lib/output-directory-manager";
import {ExecutionContext, LoboConfig} from "../../../lib/plugin";
import {ElmPackageHelper, ElmPackageJson, UpdateCallback} from "../../../lib/elm-package-helper";


let expect = chai.expect;
chai.use(SinonChai);

describe("lib output-directory-manager", () => {
  let RewiredOutputDirectoryManager = rewire("../../../lib/output-directory-manager");
  let rewiredImp;
  let outputDirectoryManager: OutputDirectoryManagerImp;
  let mockCp: Sinon.SinonStub;
  let mockDirname: Sinon.SinonStub;
  let mockExists: Sinon.SinonStub;
  let mockHelperRead: Sinon.SinonStub;
  let mockHelperUpdateSourceDirectories: Sinon.SinonStub;
  let mockLogger: Logger;
  let mockLn: Sinon.SinonStub;
  let mockMkDir: Sinon.SinonStub;
  let mockHelper: ElmPackageHelper;
  let mockResolvePath: Sinon.SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockCp = Sinon.stub();
    mockDirname = Sinon.stub();
    mockExists = Sinon.stub();
    mockLn = Sinon.stub();
    mockMkDir = Sinon.stub();
    mockResolvePath = Sinon.stub();

    revert = RewiredOutputDirectoryManager.__set__({
      fs: {existsSync: mockExists},
      path: {dirname: mockDirname, resolve: mockResolvePath},
      shelljs: {cp: mockCp, ln: mockLn, mkdir: mockMkDir}
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

  describe("generateBuildOutputFilePath", () => {
    it("should return a file name in the config.LoboDirectory", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "/./.foo"};
      mockResolvePath.returns("bar/.foo");

      // act
      let actual = outputDirectoryManager.generateBuildOutputFilePath(config);

      // assert
      expect(actual).to.match(/\.foo\/.+\.js$/);
    });

    it("should return a file name with 'lobo-test-' prefix", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};
      mockResolvePath.returns("bar/.foo");

      // act
      let actual = outputDirectoryManager.generateBuildOutputFilePath(config);

      // assert
      expect(actual).to.match(/\/lobo-test.+\.js$/);
    });

    it("should return a js file name", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};
      mockResolvePath.returns("bar/.foo");

      // act
      let actual = outputDirectoryManager.generateBuildOutputFilePath(config);

      // assert
      expect(actual).to.match(/.js$/);
    });
  });

  describe("sync", () => {
    it("should return a promise that calls configBuildDirectory with the loboDirectory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.configBuildDirectory).to.have.been.calledWith("foo", Sinon.match.any);
      });
    });

    it("should return a promise that calls configBuildDirectory with the test directory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.configBuildDirectory).to.have.been.calledWith(Sinon.match.any, "bar");
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the config", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(context.config, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the test directory", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the dir of the test file", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();
      mockDirname.returns("qux");

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "qux", Sinon.match.any);
      });
    });

    it("should return a promise that calls syncLoboTestElmPackage with the loboElmPackageIsCopy flag", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      let mockConfigBuildDirectory = Sinon.mock();
      mockConfigBuildDirectory.returns(true);
      outputDirectoryManager.configBuildDirectory = mockConfigBuildDirectory;
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then(() => {
        expect(outputDirectoryManager.syncLoboTestElmPackage)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, true);
      });
    });

    it("should return a promise that sets the buildOutputFilePath on the returned context", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      outputDirectoryManager.configBuildDirectory = Sinon.spy();
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      let mockGenerateBuildOutputFilePath = Sinon.mock();
      mockGenerateBuildOutputFilePath.returns("qux");
      outputDirectoryManager.generateBuildOutputFilePath = mockGenerateBuildOutputFilePath;

      // act
      let actual = outputDirectoryManager.sync(context);

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result.buildOutputFilePath).equal("qux");
      });
    });

    it("should return a promise that catches and logs any error", () => {
      // arrange
      let context = <ExecutionContext> {config: {loboDirectory: "foo"}, testDirectory: "bar", testFile: "baz"};
      let mockConfigBuildDirectory = Sinon.mock();
      mockConfigBuildDirectory.throws(new Error("qux"));
      outputDirectoryManager.configBuildDirectory = mockConfigBuildDirectory;
      outputDirectoryManager.syncLoboTestElmPackage = Sinon.spy();
      outputDirectoryManager.generateBuildOutputFilePath = Sinon.spy();

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
        outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);
      }).to.throw("Unable to read the test elm-package.json file");
    });

    it("should throw an error if the lobo test elm package does not exist", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.returns(undefined);

      // act
      expect(() => {
        outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);
      }).to.throw("Unable to read the lobo test elm-package.json file.");
    });

    it("should call updateSourceDirectories with the testElmPackageDir", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the testElmPackage", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> { sourceDirectories: [] };
      mockHelperRead.withArgs("bar").returns(expected);
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo directory", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the testDir", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> { sourceDirectories: [] };
      mockHelperRead.withArgs("bar").returns(expected);
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo elmPackage", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> { sourceDirectories: ["qux"] };
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call updateSourceDirectories with the lobo elmPackage with empty source directories when copied flag is true", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {}}};
      let expected = <ElmPackageJson> { sourceDirectories: ["qux"] };
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns(expected);
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", true);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
      expect(expected.sourceDirectories.length).to.equal(0);
    });

    it("should call updateSourceDirectories with the testFramework sourceDirectories", () => {
      // arrange
      let expected = ["abc"];
      let config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: { sourceDirectories: expected}}};
      mockHelperRead.withArgs("bar").returns({});
      mockHelperRead.withArgs("foo").returns({});
      outputDirectoryManager.updateSourceDirectories = Sinon.spy();

      // act
      outputDirectoryManager.syncLoboTestElmPackage(config, "bar", "baz", false);

      // assert
      expect(outputDirectoryManager.updateSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, expected);
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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call helper.updateSourceDirectories with the specified main testDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "qux", Sinon.match.any, Sinon.match.any);
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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any);
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
      outputDirectoryManager.updateSourceDirectories( "bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, ["foo"],
                                   Sinon.match.any);
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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any,
                                   Sinon.match.func);
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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

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
      outputDirectoryManager.updateSourceDirectories("bar", sourcePackageJson, "baz", "qux", testPackageJson, ["foo"]);

      // assert
      expect(updateAction).to.have.been.calledWith();
    });
  });
});
