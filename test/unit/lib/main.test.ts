"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as SinonChai from "sinon-chai";
import {createLobo, Lobo, LoboImp, PartialLoboConfig} from "../../../lib/main";
import {Analyzer} from "../../../lib/analyzer";
import {Builder} from "../../../lib/builder";
import {ElmApplicationJson, ElmJson, ElmPackageHelper} from "../../../lib/elm-package-helper";
import {Logger} from "../../../lib/logger";
import {Runner} from "../../../lib/runner";
import {Util} from "../../../lib/util";
import {
  ExecutionContext,
  LoboConfig, PluginConfig, PluginReporterWithConfig, PluginTestFrameworkConfig,
  PluginTestFrameworkWithConfig
} from "../../../lib/plugin";
import {TestSuiteGenerator} from "../../../lib/test-suite-generator";
import {OutputDirectoryManager} from "../../../lib/output-directory-manager";
import {DependencyManager} from "../../../lib/dependency-manager";
import {ElmCodeLookupManager} from "../../../lib/elm-code-lookup-manager";


const expect = chai.expect;
chai.use(SinonChai);

describe("lib main", () => {
  let rewiredMain = rewire("../../../lib/main");
  let rewiredImp;
  let lobo: LoboImp;
  let mockAnalyze: Sinon.SinonStub;
  let mockAnalyzer: Analyzer;
  let mockBuild: Sinon.SinonStub;
  let mockBuilder: Builder;
  let mockDependencyManager: DependencyManager;
  let mockElmCodeLookupManager: ElmCodeLookupManager;
  let mockExit: () => void;
  let mockHelper: ElmPackageHelper;
  let mockLogger: Logger;
  let mockRun: Sinon.SinonStub;
  let mockRunner: Runner;
  let mockSyncDependencies: Sinon.SinonStub;
  let mockSyncElmCodeLookup: Sinon.SinonStub;
  let mockOutputDirectoryCleanUp: Sinon.SinonStub;
  let mockOutputDirectoryPrepare: Sinon.SinonStub;
  let mockOutputDirectoryManager: OutputDirectoryManager;
  let mockTestSuiteGenerate: Sinon.SinonStub;
  let mockTestSuiteGenerator: TestSuiteGenerator;
  let mockUtil: Util;

  let revertExit: () => void;

  beforeEach(() => {
    mockExit = Sinon.stub();
    revertExit = rewiredMain.__set__({process: {exit: mockExit}});
    rewiredImp = rewiredMain.__get__("LoboImp");
    mockAnalyze = Sinon.stub();
    mockAnalyzer = <Analyzer> {analyze: mockAnalyze};
    mockBuild = Sinon.stub();
    mockBuilder = <Builder> {build: mockBuild};
    mockSyncDependencies = Sinon.stub();
    mockDependencyManager = <DependencyManager> {sync: mockSyncDependencies};
    mockSyncElmCodeLookup = Sinon.stub();
    mockElmCodeLookupManager = <ElmCodeLookupManager> {sync: mockSyncElmCodeLookup};
    mockHelper = <ElmPackageHelper><{}> {isApplicationJson: Sinon.stub(), pathElmJson: Sinon.stub(), tryReadElmJson: Sinon.stub()};
    mockLogger = <Logger> {
      debug: Sinon.stub(), error: Sinon.stub(), info: Sinon.stub(),
      trace: Sinon.stub(), warn: Sinon.stub()
    };
    mockRun = Sinon.stub();
    mockRunner = <Runner> {run: mockRun};
    mockOutputDirectoryCleanUp = Sinon.stub();
    mockOutputDirectoryPrepare = Sinon.stub();
    mockOutputDirectoryManager = <OutputDirectoryManager> {cleanup: mockOutputDirectoryCleanUp, prepare: mockOutputDirectoryPrepare};
    mockTestSuiteGenerate = Sinon.stub();
    mockTestSuiteGenerator = <TestSuiteGenerator> {generate: mockTestSuiteGenerate};
    mockUtil = <Util><{}> {
      availablePlugins: Sinon.stub(),
      checkNodeVersion: Sinon.stub(),
      getPlugin: Sinon.stub(),
      getPluginConfig: Sinon.stub(),
      isInteger: Sinon.stub(),
      logStage: Sinon.stub(),
      padRight: Sinon.stub(),
      unsafeLoad: Sinon.stub()
    };

    lobo = new rewiredImp(mockAnalyzer, mockBuilder, mockDependencyManager, mockElmCodeLookupManager, mockHelper, mockLogger,
                          mockOutputDirectoryManager, mockRunner, mockTestSuiteGenerator, mockUtil, false, false, false);
  });

  afterEach(() => {
    revertExit();
  });

  describe("createMain", () => {
    it("should return main", () => {
      // act
      let actual: Lobo = createLobo();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("execute", () => {
    it("should check the node version is at least 0.11.13", () => {
      // act
      lobo.execute();

      // assert
      expect(mockUtil.checkNodeVersion).to.have.been.calledWith(0, 11, 13);
    });

    it("should validate the configuration after calling configure", () => {
      // arrange
      lobo.configure = () => {
        expect(lobo.validateConfiguration).not.to.have.been.called;

        return <LoboConfig> {};
      };
      lobo.launch = Sinon.mock();
      lobo.validateConfiguration = Sinon.spy();

      // act
      lobo.execute();

      // assert
      expect(lobo.validateConfiguration).to.have.been.called;
    });

    it("should call watch with config when program.watch is true", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "", testMainElm: ""};
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).returns(config);
      lobo.validateConfiguration = Sinon.stub();
      lobo.watch = Sinon.spy();
      const revert = rewiredMain.__with__({program: {watch: true}});

      // act
      revert(() => lobo.execute());

      // assert
      expect(lobo.watch).to.have.been.calledWith(Sinon.match.has("config", config));
    });

    it("should call launch with config when program.watch is false", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "", testMainElm: ""};
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).returns(config);
      lobo.validateConfiguration = Sinon.stub();
      lobo.launch = Sinon.mock();
      const revert = rewiredMain.__with__({program: {watch: false}});

      // act
      revert(() => lobo.execute());

      // assert
      expect(lobo.launch).to.have.been.calledWith(Sinon.match.has("config", config));
    });

    it("should exit the process with exitCode 1 when there is an error", () => {
      // arrange
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).throws(new Error());

      // act
      lobo.execute();

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });
  });

  describe("launchStages", () => {
    it("should call outputDirectoryManager.prepare with the initial context", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(expected);

      // assert
      return actual.finally(() => {
        expect(mockOutputDirectoryManager.prepare).to.have.been.calledWith(expected);
      });
    });

    it("should call dependencyManager.sync with the context from output directory manager", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves(expected);
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockDependencyManager.sync).to.have.been.calledWith(expected);
      });
    });

    it("should call elmCodeLookupManager.sync with the context from dependency manager", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves(expected);
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockElmCodeLookupManager.sync).to.have.been.calledWith(expected);
      });
    });

    it("should call testSuiteGenerator.generate with the context from elm code lookup manager", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves(expected);
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockTestSuiteGenerator.generate).to.have.been.calledWith(expected);
      });
    });

    it("should call builder.build with the context from test suite generator", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves(expected);
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockBuilder.build).to.have.been.calledWith(expected);
      });
    });

    it("should call runner.run with the context from analyze", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves(expected);
      mockRun.resolves({});
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockRunner.run).to.have.been.calledWith(expected);
      });
    });

    it("should call outputDirectoryManager.cleanUp with the final context when there are no errors", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves(expected);
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockOutputDirectoryCleanUp).to.have.been.calledWith(expected);
      });
    });

    it("should call outputDirectoryManager.cleanUp with the current context when there is an error", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves(expected);
      mockTestSuiteGenerate.rejects(new Error());
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.catch(() => {
        expect(mockOutputDirectoryCleanUp).to.have.been.calledWith(expected);
      });
    });

    it("should return the execution context from runner.run", () => {
      // arrange
      const expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectoryPrepare.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves(expected);
      mockOutputDirectoryCleanUp.resolves({});

      // act
      const actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result).to.equal(expected);
      });
    });
  });

  describe("launch", () => {
    it("should not call done with the context when watch is false", () => {
      // arrange
      const revert = rewiredMain.__with__({program: {watch: false}});
      lobo.done = Sinon.spy();
      const mockLaunchStages = Sinon.stub();
      mockLaunchStages.resolves();
      lobo.launchStages = mockLaunchStages;

      // act
      let actual: Bluebird<void> = undefined;
      revert(() => actual = lobo.launch(<ExecutionContext>{}));

      // assert
      return actual.then(() => {
        expect(lobo.done).not.to.have.been.called;
      });
    });

    it("should call done with the context from launchStages when watch is true", () => {
      // arrange
      const expected = <ExecutionContext>{config: {loboDirectory: "foo", testMainElm: "bar"}};
      const revert = rewiredMain.__with__({program: {watch: true}});
      lobo.done = Sinon.spy();
      const mockLaunchStages = Sinon.stub();
      mockLaunchStages.resolves(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      let actual: Bluebird<void> = undefined;
      revert(() => actual = lobo.launch(<ExecutionContext>{}));

      // assert
      return actual.then(() => {
        expect(lobo.done).to.have.been.calledWith(expected);
      });
    });

    describe("watch is true", () => {
      let revertProgram: () => void;

      beforeEach(() => {
        revertProgram = rewiredMain.__set__({program: {watch: true}});
      });

      afterEach(() => {
        revertProgram();
      });

      it("should call done with the context when an error is thrown and watch is true", () => {
        // arrange
        const expected = <ExecutionContext>{config: {loboDirectory: "foo", testMainElm: "bar"}};
        lobo.done = Sinon.spy();
        const mockLaunchStages = Sinon.stub();
        mockLaunchStages.rejects(new Error());
        lobo.launchStages = mockLaunchStages;

        // act
        const actual = lobo.launch(expected);

        // assert
        return actual.then(() => {
          expect(lobo.done).to.have.been.calledWith(expected);
          expect(mockExit).not.to.have.been.called;
        });
      });
    });

    describe("watch is false", () => {
      let revertProgram: () => void;

      beforeEach(() => {
        revertProgram = rewiredMain.__set__({program: {watch: false}});
      });

      afterEach(() => {
        revertProgram();
      });

      it("should call process.exit with exitCode of 1 when an error is thrown and watch is false", () => {
        // arrange
        const mockLaunchStages = Sinon.stub();
        mockLaunchStages.rejects(new Error());
        lobo.launchStages = mockLaunchStages;

        // act
        const actual = lobo.launch(<ExecutionContext>{});

        // assert
        return actual.then(() => {
          expect(mockExit).to.have.been.calledWith(1);
        });
      });
    });

    it("should call handleUncaughtException when an ReferenceError is thrown", () => {
      // arrange
      const expected = new ReferenceError("foo");
      lobo.handleUncaughtException = Sinon.spy();
      const mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      const actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(lobo.handleUncaughtException).to.have.been.calledWith(expected, Sinon.match.any);
      });
    });

    it("should log Debug.crash errors to the logger", () => {
      // arrange
      const expected = new Error("Ran into a `Debug.crash` in module");
      lobo.handleUncaughtException = Sinon.spy();
      const mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      const actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(mockLogger.error).to.have.been.calledWith(expected);
      });
    });

    it("should not log Analysis Failed errors to the logger", () => {
      // arrange
      const expected = new Error("Analysis Issues Found");
      lobo.handleUncaughtException = Sinon.spy();
      const mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      const actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(mockLogger.error).not.to.have.been.called;
      });
    });

    it("should not log Test Run Failed errors to the logger", () => {
      // arrange
      const expected = new Error("Test Run Failed");
      lobo.handleUncaughtException = Sinon.spy();
      const mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      const actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(mockLogger.error).not.to.have.been.called;
      });
    });
  });

  describe("done", () => {
    it("should call launch when waiting is true", () => {
      // arrange
      const expected = <ExecutionContext>{};
      lobo = new rewiredImp(mockAnalyzer, mockBuilder, mockDependencyManager, mockElmCodeLookupManager, mockHelper, mockLogger,
                            mockOutputDirectoryManager, mockRunner, mockTestSuiteGenerator, mockUtil, false, false, true);
      lobo.launch = Sinon.spy();

      // act
      lobo.done(expected);

      // assert
      expect(lobo.launch).to.have.been.calledWith(expected);
    });

    it("should not call launch when waiting is false", () => {
      // arrange
      const expected = <ExecutionContext>{};
      lobo = new rewiredImp(mockAnalyzer, mockBuilder, mockDependencyManager, mockElmCodeLookupManager, mockHelper, mockLogger,
                            mockOutputDirectoryManager, mockRunner, mockTestSuiteGenerator, mockUtil, false, false, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.done(expected);

      // assert
      expect(lobo.launch).not.to.have.been.called;
    });
  });

  describe("watch", () => {
    let mockOn: SinonStub;
    let mockWatch: SinonStub;
    let revertWatch: () => void;

    beforeEach(() => {
      mockWatch = Sinon.stub();
      mockOn = Sinon.stub();
      mockOn.returns({on: mockOn});
      mockWatch.returns({on: mockOn});

      revertWatch = rewiredMain.__set__({chokidar: {watch: mockWatch}});
    });

    afterEach(() => {
      revertWatch();
    });

    it("should watch the app elm.json path returned by elmPackageHelper.path", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "foo"};
      const context = <ExecutionContext>{config};
      (<Sinon.SinonStub>mockHelper.pathElmJson).returns("bar/elm.json");

      // act
      lobo.watch(context);

      // assert
      expect(mockWatch.firstCall.args[0]).to.include("bar/elm.json");
    });

    it("should watch paths excluding elm-stuff directory", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "foo"};
      const context = <ExecutionContext>{config};

      // act
      lobo.watch(context);

      // assert
      const ignored = mockWatch.firstCall.args[1].ignored;
      expect(ignored.test("/elm-stuff/")).to.be.true;
    });

    it("should watch the directories in the test elm.json", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "."};
      const context = <ExecutionContext>{config};
      (<SinonStub>mockHelper.tryReadElmJson).returns({sourceDirectories: ["./", "./src"]});
      (<Sinon.SinonStub>mockHelper.pathElmJson).returns("./elm.json");
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };
      const revert = rewiredMain.__with__({process: {cwd: () => "./"}, program: {testDirectory: "tests"}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.watch(context));

      // assert
      expect(mockWatch.firstCall.args[0]).to.include("./src");
      expect(mockWatch.firstCall.args[0]).to.include("./tests");
    });

    it("should call launch with supplied context when 'ready' event is received", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "foo"};
      const context = <ExecutionContext>{config};
      lobo.launch = Sinon.spy();
      mockOn.callsFake((event, func) => {
        if (event === "ready") {
          func();
        }

        return {on: mockOn};
      });

      // act
      lobo.watch(context);

      // assert
      expect(lobo.launch).to.have.been.calledWith(context);
    });

    it("should not call launch with supplied context when 'all' event is received and ready is false", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "foo"};
      const context = <ExecutionContext>{config};
      mockOn.callsFake((event, func) => {
        if (event === "all") {
          func();
        }

        return {on: mockOn};
      });

      lobo = new rewiredImp(mockAnalyzer, mockBuilder, mockDependencyManager, mockElmCodeLookupManager, mockHelper, mockLogger,
                            mockOutputDirectoryManager, mockRunner, mockTestSuiteGenerator, mockUtil, false, false, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.watch(context);

      // assert
      expect(lobo.launch).not.to.have.been.called;
    });

    it("should not call launch with supplied context when 'all' event is received and ready is true and busy is true", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "foo"};
      const context = <ExecutionContext>{config};
      mockOn.callsFake((event, func) => {
        if (event === "all") {
          func();
        }

        return {on: mockOn};
      });

      lobo = new rewiredImp(mockAnalyzer, mockBuilder, mockDependencyManager, mockElmCodeLookupManager, mockHelper, mockLogger,
                            mockOutputDirectoryManager, mockRunner, mockTestSuiteGenerator, mockUtil, true, true, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.watch(context);

      // assert
      expect(lobo.launch).not.to.have.been.called;
    });

    it("should call launch with supplied context when 'all' event is received and ready is true", () => {
      // arrange
      const config = <LoboConfig>{appDirectory: "foo"};
      const context = <ExecutionContext>{config};
      mockOn.callsFake((event, func) => {
        if (event === "all") {
          func();
        }

        return {on: mockOn};
      });

      lobo = new rewiredImp(mockAnalyzer, mockBuilder, mockDependencyManager, mockElmCodeLookupManager, mockHelper, mockLogger,
                            mockOutputDirectoryManager, mockRunner, mockTestSuiteGenerator, mockUtil, false, true, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.watch(context);

      // assert
      expect(lobo.launch).to.have.been.calledWith(context);
    });
  });

  describe("configure", () => {
    let revertProcess: () => void;
    let revertProgram: () => void;
    let mockAllowUnknownOption: SinonStub;
    let mockOn: SinonStub;
    let mockOption: SinonStub;
    let mockOpts: SinonStub;
    let mockParse: SinonStub;
    let programMocks: {};
    let mockVersion: SinonStub;

    beforeEach(() => {
      (<SinonStub>mockUtil.unsafeLoad).returns({});
      (<SinonStub>mockUtil.getPlugin).returns({});
      (<SinonStub>mockUtil.getPluginConfig).returns({});
      revertProcess = rewiredMain.__set__({process: {argv: []}});
      mockAllowUnknownOption = Sinon.stub();
      mockOn = Sinon.stub();
      mockOption = Sinon.stub();
      mockOpts = Sinon.stub();
      mockParse = Sinon.stub();
      mockVersion = Sinon.stub();

      programMocks = {
        allowUnknownOption: mockAllowUnknownOption,
        on: mockOn,
        option: mockOption,
        opts: mockOpts,
        parse: mockParse,
        version: mockVersion
      };
      mockVersion.returns(programMocks);
      mockOption.returns(programMocks);

      revertProgram = rewiredMain.__set__({program: programMocks});
    });

    afterEach(() => {
      revertProcess();
      revertProgram();
    });

    it("should configure program to call showCustomHelp when '--help' option is used", () => {
      // arrange
      lobo.showCustomHelp = Sinon.spy();

      // act
      lobo.configure();

      // assert
      expect(mockOn.firstCall.args[0]).to.equal("--help");
      mockOn.firstCall.args[1]();
      expect(lobo.showCustomHelp).to.have.been.called;
    });

    it("should set the program version from the npm package.json", () => {
      // arrange
      (<SinonStub>mockUtil.unsafeLoad).returns({version: "123"});

      // act
      lobo.configure();

      // assert
      expect(mockVersion).to.have.been.calledWith("123");
    });

    it("should add the '--compiler' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--compiler <value>", Sinon.match.any);
    });

    it("should add the '--debug' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--debug", Sinon.match.any);
    });

    it("should add the '--failOnOnly' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--failOnOnly", Sinon.match.any);
    });

    it("should add the '--failOnSkip' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--failOnSkip", Sinon.match.any);
    });

    it("should add the '--failOnTodo' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--failOnTodo", Sinon.match.any);
    });

    it("should add the '--framework' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--framework <value>", Sinon.match.any);
    });

    it("should add the '--noAnalysis' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--noAnalysis", Sinon.match.any);
    });

    it("should add the '--noInstall' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--noInstall", Sinon.match.any);
    });

    /*it("should add the '--optimize' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--optimize <value>", Sinon.match.any);
    });

    it("should add the '--prompt' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--prompt <value>", Sinon.match.any);
    });*/

    it("should add the '--quiet' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--quiet", Sinon.match.any);
    });

    it("should add the '--reporter' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--reporter <value>", Sinon.match.any);
    });

    it("should add the '--testDirectory' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--testDirectory <value>", Sinon.match.any);
    });

    it("should add the '--verbose' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--verbose", Sinon.match.any);
    });

    it("should add the '--veryVerbose' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--veryVerbose", Sinon.match.any);
    });

    it("should add the '--watch' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--watch", Sinon.match.any);
    });

    it("should call loadReporterConfig with program.reporter", () => {
      // arrange
      (<{ reporter: string }>programMocks).reporter = "foo";
      const revert = rewiredMain.__with__({program: programMocks});
      lobo.loadReporterConfig = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadReporterConfig).to.have.been.calledWith("foo");
    });

    it("should call loadReporter with program.reporter", () => {
      // arrange
      (<{ reporter: string }>programMocks).reporter = "foo";
      const revert = rewiredMain.__with__({program: programMocks});
      lobo.loadReporter = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadReporter).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call loadReporter with reporter config", () => {
      // arrange
      const expected = {name: "foo"};
      lobo.loadReporterConfig = Sinon.stub();
      (<SinonStub>lobo.loadReporterConfig).returns(expected);
      (<{ reporter: string }>programMocks).reporter = "foo";
      const revert = rewiredMain.__with__({program: programMocks});
      lobo.loadReporter = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadReporter).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return config with reporter set to the value returned from loadReporter", () => {
      // arrange
      const expected = <PluginReporterWithConfig> {config: {name: "foo"}};
      lobo.loadReporter = Sinon.stub();
      (<SinonStub>lobo.loadReporter).returns(expected);

      // act
      const actual = lobo.configure();

      // assert
      expect(actual.reporter).to.equal(expected);
    });

    it("should call loadReporterConfig with program.framework", () => {
      // arrange
      (<{ framework: string }>programMocks).framework = "foo";
      const revert = rewiredMain.__with__({program: programMocks});
      lobo.loadTestFrameworkConfig = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadTestFrameworkConfig).to.have.been.calledWith("foo");
    });

    it("should call loadReporter with program.framework", () => {
      // arrange
      (<{ framework: string }>programMocks).framework = "foo";
      const revert = rewiredMain.__with__({program: programMocks});
      lobo.loadTestFramework = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadTestFramework).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call loadReporter with testing framework config", () => {
      // arrange
      const expected = {name: "foo"};
      lobo.loadTestFrameworkConfig = Sinon.stub();
      (<SinonStub>lobo.loadTestFrameworkConfig).returns(expected);
      (<{ framework: string }>programMocks).framework = "foo";
      const revert = rewiredMain.__with__({program: programMocks});
      lobo.loadTestFramework = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadTestFramework).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return config with testFramework set to the value returned from loadTestFramework", () => {
      // arrange
      const expected = <PluginTestFrameworkWithConfig> {config: {name: "foo"}};
      lobo.loadTestFramework = Sinon.stub();
      (<SinonStub>lobo.loadTestFramework).returns(expected);

      // act
      const actual = lobo.configure();

      // assert
      expect(actual.testFramework).to.equal(expected);
    });

    it("should set noCleanup to false when debug option is false", () => {
      // arrange
      (<{ debug: boolean }>programMocks).debug = false;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.noCleanup).to.be.false;
    });

    it("should set noCleanup to false when debug option is true", () => {
      // arrange
      (<{ debug: boolean }>programMocks).debug = true;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.noCleanup).to.be.true;
    });

    it("should silence shelljs when verbose is false", () => {
      // arrange
      const shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      (<{ verbose: boolean }>programMocks).verbose = false;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.true;
    });

    it("should not silence shelljs when verbose is true", () => {
      // arrange
      const shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      (<{ verbose: boolean }>programMocks).verbose = true;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.false;
    });

    it("should silence shelljs when veryVerbose is false", () => {
      // arrange
      const shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      (<{ veryVerbose: boolean }>programMocks).veryVerbose = false;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.true;
    });

    it("should not silence shelljs when veryVerbose is true", () => {
      // arrange
      const shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      (<{ veryVerbose: boolean }>programMocks).veryVerbose = true;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.false;
    });

    it("should set optimize to true when --optimize flag exists", () => {
      // arrange
      (<{ optimize: string }>programMocks).optimize = "optimize";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.optimize).to.be.true;
    });

    it("should set optimize to false when --optimize flag does not exist", () => {
      // arrange
      (<{ optimize: string }>programMocks).optimize = undefined;
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.optimize).to.be.false;
    });

    it("should convert program prompt 'Yes' to true", () => {
      // arrange
      (<{ prompt: string }>programMocks).prompt = "Yes";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.true;
    });

    it("should convert program prompt 'n' to false", () => {
      // arrange
      (<{ prompt: string }>programMocks).prompt = "n";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should convert program prompt 'N' to false", () => {
      // arrange
      (<{ prompt: string }>programMocks).prompt = "N";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should convert program prompt 'no' to false", () => {
      // arrange
      (<{ prompt: string }>programMocks).prompt = "no";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should convert program prompt 'No' to false", () => {
      // arrange
      (<{ prompt: string }>programMocks).prompt = "No";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should set the compiler path to program.compiler", () => {
      // arrange
      (<{ compiler: string }>programMocks).compiler = "foo";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.compiler).to.equal("foo");
    });

    it("should set the compiler path to a normalized program.compiler path", () => {
      // arrange
      (<{ compiler: string }>programMocks).compiler = "foo/../bar";
      const revert = rewiredMain.__with__({program: programMocks});

      // act
      let actual: PartialLoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.compiler).to.equal("bar");
    });
  });

  describe("showCustomHelp", () => {
    it("should call showCustomHelpForPlugins with 'testing framework'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been
        .calledWith({fileSpec: Sinon.match.any, type: "testing framework"}, Sinon.match.any);
    });

    it("should call showCustomHelpForPlugins with 'test-plugin'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith({fileSpec: "test-plugin", type: Sinon.match.any}, Sinon.match.any);
    });

    it("should call showCustomHelpForPlugins with max option length of 29", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith(Sinon.match.any, 29);
    });

    it("should call showCustomHelpForPlugins with 'testing framework'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith({fileSpec: Sinon.match.any, type: "reporter"}, Sinon.match.any);
    });

    it("should call showCustomHelpForPlugins with 'test-plugin'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith({fileSpec: "reporter-plugin", type: Sinon.match.any}, Sinon.match.any);
    });
  });

  describe("showCustomHelpForPlugins", () => {
    it("should get the available plugins from calling util.availablePlugins with the supplied file spec", () => {
      // act
      lobo.showCustomHelpForPlugins({fileSpec: "foo", type: "bar"}, 123);

      // assert
      expect(mockUtil.availablePlugins).to.have.been.calledWith("foo");
    });

    it("should get the config for each available plugin by calling util.getPluginConfig with the plugin name", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc", "def"]);

      // act
      lobo.showCustomHelpForPlugins({fileSpec: "foo", type: "bar"}, 123);

      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, "abc", Sinon.match.any);
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, "def", Sinon.match.any);
    });

    it("should get the config for each available plugin by calling util.getPluginConfig with the supplied type", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc", "def"]);

      // act
      lobo.showCustomHelpForPlugins({fileSpec: "foo", type: "bar"}, 123);

      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any);
    });

    it("should get the config for each available plugin by calling util.getPluginConfig with the file spec", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc", "def"]);

      // act
      lobo.showCustomHelpForPlugins({fileSpec: "foo", type: "bar"}, 123);

      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo");
    });

    it("should log the config.options for each available plugin", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc"]);
      (<SinonStub>mockUtil.getPluginConfig).returns({options: [{flags: "def", description: "ghi"}]});
      (<SinonStub>mockUtil.padRight).callsFake(x => x + " ");

      // act
      lobo.showCustomHelpForPlugins({fileSpec: "foo", type: "bar"}, 123);

      // assert
      expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/def.*ghi/));
    });
  });

  describe("validateConfiguration", () => {
    beforeEach(() => {
      (<SinonStub>mockUtil.isInteger).returns(true);
    });

    it("should log an error when the elm compiler cannot be found", () => {
      // arrange
      const revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: () => false}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unable to find the elm compiler");
    });

    it("should not log an error when the elm compiler is found", () => {
      // arrange
      const revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).not.to.have.been.calledWith("Unable to find the elm compiler");
    });

    it("should call process.exit with an exitCode of 1 when the elm compiler cannot be found", () => {
      // arrange
      const revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: () => false}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error with the specified test directory when the specified test directory cannot be found", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {resolve: x => "abc-" + x},
        program: {compiler: "foo", testDirectory: "bar"},
        shelljs: {test: () => false}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unable to find \"abc-bar\"");
    });

    it("should call process.exit with an exitCode of 1 when the test directory cannot be found", () => {
      // arrange
      const revert = rewiredMain.__with__({
        program: {compiler: "foo", testDirectory: "bar"},
        shelljs: {test: () => false}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error when the test framework is elm-test and showSkip is true", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {framework: "elm-test", showSkip: true},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Invalid configuration combination");
    });

    it("should not log an error when the test framework is elm-test and showSkip is false", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {framework: "elm-test", showSkip: false},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).not.to.have.been.calledWith("Invalid configuration combination");
    });

    it("should call process.exit with an exitCode of 1 when the test framework is elm-test and showSkip is true", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {framework: "elm-test", showSkip: true},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error when the reporter is junit and reportFile is unset", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {reporter: "junit-reporter", reportFile: undefined},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Missing mandatory configuration option");
    });

    it("should not log an error when the reporter is junit and reportFile has a value", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {reporter: "junit-reporter", reportFile: "foo"},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).not.to.have.been.calledWith("Missing mandatory configuration option");
    });

    it("should call process.exit with an exitCode of 1 when the reporter is junit and reportFile is unset", () => {
      // arrange
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {reporter: "junit-reporter", reportFile: undefined},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error when the reporter is junit and diffMaxLength is not an integer", () => {
      // arrange
      (<SinonStub>mockUtil.isInteger).returns(false);
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {reporter: "junit-reporter", reportFile: "foo", diffMaxLength: "bar"},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Invalid configuration option");
    });

    it("should not log an error when the reporter is junit and diffMaxLength is an integer", () => {
      // arrange
      (<SinonStub>mockUtil.isInteger).returns(true);
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {reporter: "junit-reporter", reportFile: "foo", diffMaxLength: "122"},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).not.to.have.been.calledWith("Invalid configuration option");
    });

    it("should call process.exit with an exitCode of 1 when the reporter is junit and diffMaxLength is not an integer", () => {
      // arrange
      (<SinonStub>mockUtil.isInteger).returns(false);
      const revert = rewiredMain.__with__({
        path: {join: () => undefined},
        program: {reporter: "junit-reporter", reportFile: "foo", diffMaxLength: "122"},
        shelljs: {test: () => true}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });
  });

  describe("loadReporter", () => {
    it("should call loadPlugin with a type of 'reporter'", () => {
      // arrange
      const config = <PluginConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadReporter("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith("reporter", Sinon.match.any, Sinon.match.any);
    });

    it("should call loadPlugin with the program.reporter", () => {
      // arrange
      const config = <PluginConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadReporter("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call loadPlugin with a file spec of 'reporter-plugin'", () => {
      // arrange
      const config = <PluginConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadReporter("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "reporter-plugin");
    });

    it("should return the loaded reporter plugin", () => {
      // arrange
      const config = <PluginConfig> {name: "bar"};
      const expected = <PluginReporterWithConfig> {};
      (<SinonStub>mockUtil.getPlugin).returns(expected);

      // act
      const actual = lobo.loadReporter("foo", config);

      // assert
      expect(actual).to.equal(expected);
      expect(actual.config).to.equal(config);
    });
  });

  describe("loadTestFramework", () => {
    it("should call getPlugin with a type of 'testing framework'", () => {
      // arrange
      const config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadTestFramework("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith("testing framework", Sinon.match.any, Sinon.match.any);
    });

    it("should call getPlugin with the supplied pluginName", () => {
      // arrange
      const config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadTestFramework("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call getPlugin with a file spec of 'test-plugin'", () => {
      // arrange
      const config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadTestFramework("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "test-plugin");
    });

    it("should return the loaded test plugin", () => {
      // arrange
      const expected = <PluginTestFrameworkWithConfig> {};
      const config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns(expected);

      // act
      const actual = lobo.loadTestFramework("foo", config);

      // assert
      expect(actual).to.equal(expected);
      expect(actual.config).to.equal(config);
    });
  });

  describe("loadPluginConfig", () => {
    it("should call util.getPlugin with the supplied type", () => {
      // act
      lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz");

      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call util.getPlugin with the supplied pluginName", () => {
      // act
      lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz");

      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call util.getPlugin with the supplied fileSpec", () => {
      // act
      lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz");

      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo");
    });

    it("should return the plugin loaded by util.getPlugin", () => {
      // arrange
      const expected = {name: "abc"};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);

      // act
      const actual = lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz");

      // assert
      expect(actual).to.equal(expected);
    });

    it("should add the plugin options to the program option flags", () => {
      // arrange
      const expected = {name: "abc", options: [{flags: "def", description: "ghi"}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      const mockOption = Sinon.stub();
      const revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith("def", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should add the plugin options to the program option description", () => {
      // arrange
      const expected = {name: "abc", options: [{flags: "def", description: "ghi"}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      const mockOption = Sinon.stub();
      const revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith(Sinon.match.any, "ghi", Sinon.match.any, Sinon.match.any);
    });

    it("should add the plugin options to the program option parser", () => {
      // arrange
      const mockParser = Sinon.stub();
      const expected = {name: "abc", options: [{flags: "def", description: "ghi", parser: mockParser}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      const mockOption = Sinon.stub();
      const revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, mockParser, Sinon.match.any);
    });

    it("should add the plugin options to the program option default value", () => {
      // arrange
      const expected = {name: "abc", options: [{flags: "def", description: "ghi", defaultValue: 123}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      const mockOption = Sinon.stub();
      const revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, 123);
    });

    it("should log an error when the plugin option does not have a flags property", () => {
      // arrange
      const expected = {name: "abc", options: [{description: "ghi"}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);

      // act
      lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz");

      // assert
      expect(mockLogger.error).to.have.been.called;
    });
  });

  describe("handleUncaughtException", () => {
    it("should log undefined error", () => {
      // arrange
      const context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(undefined, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown general errors", () => {
      // arrange
      const error = new Error();
      const context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown reference errors", () => {
      // arrange
      const error = new ReferenceError();
      const context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown reference errors when stack trace does not exist", () => {
      // arrange
      const error = new ReferenceError();
      error.stack = undefined;
      const context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log reference errors due to 'findTests is not defined' correctly", () => {
      // arrange
      const error = new ReferenceError("ElmTest.Plugin$findTests is not defined");
      error.stack = "foo";
      const context = <ExecutionContext> {buildOutputFilePath: "foo"};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an npm upgrade to lobo: ");
    });

    it("should log unknown reference error for missing browser objects correctly", () => {
      // arrange
      const error = new ReferenceError();
      error.stack = "foo";
      const context = <ExecutionContext> {buildOutputFilePath: "foo"};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an elm package using objects that are found in the browser but not in a node process");
    });

    it("should log unknown type error for missing browser objects correctly", () => {
      // arrange
      const error = new TypeError();
      error.stack = "foo";
      const context = <ExecutionContext> {buildOutputFilePath: "foo"};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an elm package using objects that are found in the browser but not in a node process");
    });

    it("should not ask for rerun with verbose option when verbose is set", () => {
      // arrange
      const error = new TypeError();
      error.stack = "foo";
      const context = <ExecutionContext> {buildOutputFilePath: "foo"};
      const revert = rewiredMain.__with__({program: {verbose: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockLogger.error).to.have.been.not.calledWith("Please rerun lobo with the --verbose option to see the cause of the error");
    });

    it("should not ask for rerun with verbose option when veryVerbose is set", () => {
      // arrange
      const error = new TypeError();
      error.stack = "foo";
      const context = <ExecutionContext> {buildOutputFilePath: "foo"};
      const revert = rewiredMain.__with__({program: {veryVerbose: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockLogger.error).to.have.been.not.calledWith("Please rerun lobo with the --verbose option to see the cause of the error");
    });

    it("should ask for rerun with verbose option when verbose is not set", () => {
      // arrange
      const error = new TypeError();
      error.stack = "foo";
      const context = <ExecutionContext> {buildOutputFilePath: "foo"};
      const revert = rewiredMain.__with__({program: {verbose: false}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Please rerun lobo with the --verbose option to see the cause of the error");
    });

    it("should not exit the process when there is an error and in watch mode", () => {
      // arrange
      const error = new Error();
      const context = <ExecutionContext> {config: {}};
      const revert = rewiredMain.__with__({program: {watch: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockExit).not.to.have.been.called;
    });

    it("should exit the process with exitCode 1 when there is an error and not in watch mode", () => {
      // arrange
      const error = new Error();
      const context = <ExecutionContext> {};
      const revert = rewiredMain.__with__({program: {watch: false}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });
  });
});
