"use strict";

import * as Bluebird from "bluebird";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as SinonChai from "sinon-chai";
import {createLobo, Lobo, LoboImp} from "../../../lib/main";
import {Analyzer} from "../../../lib/analyzer";
import {Builder} from "../../../lib/builder";
import {ElmPackageHelper} from "../../../lib/elm-package-helper";
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


let expect = chai.expect;
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
  let mockOutputDirectorySync: Sinon.SinonStub;
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
    mockHelper = <ElmPackageHelper><{}> {read: Sinon.stub()};
    mockLogger = <Logger> {
      debug: Sinon.stub(), error: Sinon.stub(), info: Sinon.stub(),
      trace: Sinon.stub(), warn: Sinon.stub()
    };
    mockRun = Sinon.stub();
    mockRunner = <Runner> {run: mockRun};
    mockOutputDirectorySync = Sinon.stub();
    mockOutputDirectoryManager = <OutputDirectoryManager> {sync: mockOutputDirectorySync};
    mockTestSuiteGenerate = Sinon.stub();
    mockTestSuiteGenerator = <TestSuiteGenerator> {generate: mockTestSuiteGenerate};
    mockUtil = <Util><{}> {
      availablePlugins: Sinon.stub(),
      checkNodeVersion: Sinon.stub(),
      getPlugin: Sinon.stub(),
      getPluginConfig: Sinon.stub(),
      isInteger: Sinon.stub(),
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
      let config = <LoboConfig> {loboDirectory: "", testMainElm: ""};
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).returns(config);
      lobo.validateConfiguration = Sinon.stub();
      lobo.watch = Sinon.spy();
      let revert = rewiredMain.__with__({program: {watch: true}});

      // act
      revert(() => lobo.execute());

      // assert
      expect(lobo.watch).to.have.been.calledWith(Sinon.match.has("config", config));
    });

    it("should call launch with config when program.watch is false", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "", testMainElm: ""};
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).returns(config);
      lobo.validateConfiguration = Sinon.stub();
      lobo.launch = Sinon.mock();
      let revert = rewiredMain.__with__({program: {watch: false}});

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
    it("should call dependencyManager.sync with the initial context", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectorySync.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});

      // act
      let actual = lobo.launchStages(expected);

      // assert
      return actual.finally(() => {
        expect(mockDependencyManager.sync).to.have.been.calledWith(expected);
      });
    });

    it("should call outputDirectoryManager.sync with the context from dependency manager", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves(expected);
      mockOutputDirectorySync.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});

      // act
      let actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockOutputDirectoryManager.sync).to.have.been.calledWith(expected);
      });
    });

    it("should call elmCodeLookupManager.sync with the context from output directory manager", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectorySync.resolves(expected);
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});

      // act
      let actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockElmCodeLookupManager.sync).to.have.been.calledWith(expected);
      });
    });

    it("should call testSuiteGenerator.generate with the context from elm code lookup manager", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectorySync.resolves({});
      mockSyncElmCodeLookup.resolves(expected);
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});

      // act
      let actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockTestSuiteGenerator.generate).to.have.been.calledWith(expected);
      });
    });

    it("should call builder.build with the context from test suite generator", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectorySync.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves(expected);
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves({});

      // act
      let actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockBuilder.build).to.have.been.calledWith(expected);
      });
    });

    it("should call runner.run with the context from analyze", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectorySync.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves(expected);
      mockRun.resolves({});

      // act
      let actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.finally(() => {
        expect(mockRunner.run).to.have.been.calledWith(expected);
      });
    });

    it("should return the execution context from runner.run", () => {
      // arrange
      let expected = <ExecutionContext> {config: {}};
      mockSyncDependencies.resolves({});
      mockOutputDirectorySync.resolves({});
      mockSyncElmCodeLookup.resolves({});
      mockTestSuiteGenerate.resolves({});
      mockBuild.resolves({});
      mockAnalyze.resolves({});
      mockRun.resolves(expected);

      // act
      let actual = lobo.launchStages(<ExecutionContext> {});

      // assert
      return actual.then((result: ExecutionContext) => {
        expect(result).to.equal(expected);
      });
    });
  });

  describe("launch", () => {
    it("should not call done with the context when watch is false", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {watch: false}});
      lobo.done = Sinon.spy();
      let mockLaunchStages = Sinon.stub();
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
      let expected = <ExecutionContext>{config: {loboDirectory: "foo", testMainElm: "bar"}};
      let revert = rewiredMain.__with__({program: {watch: true}});
      lobo.done = Sinon.spy();
      let mockLaunchStages = Sinon.stub();
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
        let expected = <ExecutionContext>{config: {loboDirectory: "foo", testMainElm: "bar"}};
        lobo.done = Sinon.spy();
        let mockLaunchStages = Sinon.stub();
        mockLaunchStages.rejects(new Error());
        lobo.launchStages = mockLaunchStages;

        // act
        let actual = lobo.launch(expected);

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
        let mockLaunchStages = Sinon.stub();
        mockLaunchStages.rejects(new Error());
        lobo.launchStages = mockLaunchStages;

        // act
        let actual = lobo.launch(<ExecutionContext>{});

        // assert
        return actual.then(() => {
          expect(mockExit).to.have.been.calledWith(1);
        });
      });
    });

    it("should call handleUncaughtException when an ReferenceError is thrown", () => {
      // arrange
      let expected = new ReferenceError("foo");
      lobo.handleUncaughtException = Sinon.spy();
      let mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      let actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(lobo.handleUncaughtException).to.have.been.calledWith(expected, Sinon.match.any);
      });
    });

    it("should log Debug.crash errors to the logger", () => {
      // arrange
      let expected = new Error("Ran into a `Debug.crash` in module");
      lobo.handleUncaughtException = Sinon.spy();
      let mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      let actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(mockLogger.error).to.have.been.calledWith(expected);
      });
    });

    it("should not log Analysis Failed errors to the logger", () => {
      // arrange
      let expected = new Error("Analysis Issues Found");
      lobo.handleUncaughtException = Sinon.spy();
      let mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      let actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(mockLogger.error).not.to.have.been.called;
      });
    });

    it("should not log Test Run Failed errors to the logger", () => {
      // arrange
      let expected = new Error("Test Run Failed");
      lobo.handleUncaughtException = Sinon.spy();
      let mockLaunchStages = Sinon.stub();
      mockLaunchStages.rejects(expected);
      lobo.launchStages = mockLaunchStages;

      // act
      let actual = lobo.launch(<ExecutionContext>{});

      // assert
      return actual.then(() => {
        expect(mockLogger.error).not.to.have.been.called;
      });
    });
  });

  describe("done", () => {
    it("should call launch when waiting is true", () => {
      // arrange
      let expected = <ExecutionContext>{};
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
      let expected = <ExecutionContext>{};
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

    it("should watch the root elm-package.json", () => {
      // arrange
      let context = <ExecutionContext>{};

      // act
      lobo.watch(context);

      // assert
      expect(mockWatch.firstCall.args[0]).to.include("./elm-package.json");
    });

    it("should watch paths excluding elm-stuff directory", () => {
      // arrange
      let context = <ExecutionContext>{};

      // act
      lobo.watch(context);

      // assert
      let ignored = mockWatch.firstCall.args[1].ignored;
      expect(ignored.test("/elm-stuff/")).to.be.true;
    });

    it("should watch the directories in the test elm-package json", () => {
      // arrange
      let context = <ExecutionContext>{};
      (<SinonStub>mockHelper.read).returns({sourceDirectories: [".", "../src"]});
      let revert = rewiredMain.__with__({process: {cwd: () => "./"}, program: {testDirectory: "./test"}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.watch(context));

      // assert
      expect(mockWatch.firstCall.args[0]).to.include("src");
      expect(mockWatch.firstCall.args[0]).to.include("test");
    });

    it("should call launch with supplied context when 'ready' event is received", () => {
      // arrange
      let context = <ExecutionContext>{};
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
      let context = <ExecutionContext>{};
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
      let context = <ExecutionContext>{};
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
      let context = <ExecutionContext>{};
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

    it("should add the '--noInstall' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--noInstall", Sinon.match.any);
    });

    it("should add the '--noWarn' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--noWarn", Sinon.match.any);
    });

    it("should add the '--prompt' option", () => {
      // act
      lobo.configure();

      // assert
      expect(mockOption).to.have.been.calledWith("--prompt <value>", Sinon.match.any);
    });

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
      let revert = rewiredMain.__with__({program: programMocks});
      lobo.loadReporterConfig = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadReporterConfig).to.have.been.calledWith("foo");
    });

    it("should call loadReporter with program.reporter", () => {
      // arrange
      (<{ reporter: string }>programMocks).reporter = "foo";
      let revert = rewiredMain.__with__({program: programMocks});
      lobo.loadReporter = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadReporter).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call loadReporter with reporter config", () => {
      // arrange
      let expected = {name: "foo"};
      lobo.loadReporterConfig = Sinon.stub();
      (<SinonStub>lobo.loadReporterConfig).returns(expected);
      (<{ reporter: string }>programMocks).reporter = "foo";
      let revert = rewiredMain.__with__({program: programMocks});
      lobo.loadReporter = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadReporter).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return config with reporter set to the value returned from loadReporter", () => {
      // arrange
      let expected = <PluginReporterWithConfig> {config: {name: "foo"}};
      lobo.loadReporter = Sinon.stub();
      (<SinonStub>lobo.loadReporter).returns(expected);

      // act
      let actual = lobo.configure();

      // assert
      expect(actual.reporter).to.equal(expected);
    });

    it("should call loadReporterConfig with program.framework", () => {
      // arrange
      (<{ framework: string }>programMocks).framework = "foo";
      let revert = rewiredMain.__with__({program: programMocks});
      lobo.loadTestFrameworkConfig = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadTestFrameworkConfig).to.have.been.calledWith("foo");
    });

    it("should call loadReporter with program.framework", () => {
      // arrange
      (<{ framework: string }>programMocks).framework = "foo";
      let revert = rewiredMain.__with__({program: programMocks});
      lobo.loadTestFramework = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadTestFramework).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call loadReporter with testing framework config", () => {
      // arrange
      let expected = {name: "foo"};
      lobo.loadTestFrameworkConfig = Sinon.stub();
      (<SinonStub>lobo.loadTestFrameworkConfig).returns(expected);
      (<{ framework: string }>programMocks).framework = "foo";
      let revert = rewiredMain.__with__({program: programMocks});
      lobo.loadTestFramework = Sinon.spy();

      // act
      revert(() => lobo.configure());

      // assert
      expect(lobo.loadTestFramework).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return config with testFramework set to the value returned from loadTestFramework", () => {
      // arrange
      let expected = <PluginTestFrameworkWithConfig> {config: {name: "foo"}};
      lobo.loadTestFramework = Sinon.stub();
      (<SinonStub>lobo.loadTestFramework).returns(expected);

      // act
      let actual = lobo.configure();

      // assert
      expect(actual.testFramework).to.equal(expected);
    });

    it("should set cleanup of temp files when debug option is false", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ debug: boolean }>programMocks).debug = false;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      revert(() => lobo.configure());

      // assert
      expect(mockCleanup).to.have.been.called;
    });

    it("should not set cleanup of temp files when debug option is true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ debug: boolean }>programMocks).debug = true;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      revert(() => lobo.configure());

      // assert
      expect(mockCleanup).not.to.have.been.called;
    });

    it("should convert program prompt 'y' to true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "y";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.true;
    });

    it("should convert program prompt 'Y' to true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "Y";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.true;
    });

    it("should convert program prompt 'yes' to true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "yes";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.true;
    });

    it("should silence shelljs when verbose is false", () => {
      // arrange
      let shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      let mockCleanup = Sinon.stub();
      (<{ verbose: boolean }>programMocks).verbose = false;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.true;
    });

    it("should not silence shelljs when verbose is true", () => {
      // arrange
      let shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      let mockCleanup = Sinon.stub();
      (<{ verbose: boolean }>programMocks).verbose = true;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.false;
    });

    it("should silence shelljs when veryVerbose is false", () => {
      // arrange
      let shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      let mockCleanup = Sinon.stub();
      (<{ veryVerbose: boolean }>programMocks).veryVerbose = false;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.true;
    });

    it("should not silence shelljs when veryVerbose is true", () => {
      // arrange
      let shelljs = rewiredMain.__get__("shelljs");
      shelljs.config.silent = false;
      let mockCleanup = Sinon.stub();
      (<{ veryVerbose: boolean }>programMocks).veryVerbose = true;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(shelljs.config.silent).to.be.false;
    });

    it("should convert program prompt 'Yes' to true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "Yes";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.true;
    });

    it("should convert program prompt 'n' to false", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "n";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should convert program prompt 'N' to false", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "N";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should convert program prompt 'no' to false", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "no";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should convert program prompt 'No' to false", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ prompt: string }>programMocks).prompt = "No";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.prompt).to.be.false;
    });

    it("should set the compiler path to program.compiler", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ compiler: string }>programMocks).compiler = "foo";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
      revert(() => actual = lobo.configure());

      // assert
      expect(actual.compiler).to.equal("foo");
    });

    it("should set the compiler path to a normalized program.compiler path", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{ compiler: string }>programMocks).compiler = "foo/../bar";
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      let actual: LoboConfig = undefined;
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
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar", testFile: "baz"}, shelljs: {test: () => false}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unable to find the elm compiler");
    });

    it("should not log an error when the elm compiler is found", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar", testFile: "baz"}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).not.to.have.been.calledWith("Unable to find the elm compiler");
    });

    it("should call process.exit with an exitCode of 1 when the elm compiler cannot be found", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar", testFile: "baz"}, shelljs: {test: () => false}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error with the specified test file when the specified test file cannot be found in the test directory", () => {
      // arrange
      let revert = rewiredMain.__with__({
        path: {basename: () => "base", dirname: () => "dir", join: (...args) => args.join("-"), resolve: x => "abc-" + x},
        program: {compiler: "foo", testDirectory: "bar", testFile: "baz/Tests.elm"},
        shelljs: {test: () => false}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unable to find \"base\"");
    });

    it("should log an error with the specified test directory when the specified test file cannot be found in the test directory", () => {
      // arrange
      let revert = rewiredMain.__with__({
        path: {basename: () => "base", dirname: () => "dir", join: (...args) => args.join("-"), resolve: x => "abc-" + x},
        program: {compiler: "foo", testDirectory: "bar", testFile: "baz/Tests.elm"},
        shelljs: {test: () => false}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("abc-dir");
    });

    it("should call process.exit with an exitCode of 1 when the Tests.elm file cannot be found in the test directory", () => {
      // arrange
      let revert = rewiredMain.__with__({
        path: {basename: () => "base", dirname: () => "dir", join: (...args) => args.join("-"), resolve: x => "abc-" + x},
        program: {compiler: "foo", testDirectory: "bar", testFile: "baz-Tests.elm"},
        shelljs: {test: () => false}
      });

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error when the test framework is elm-test and showSkip is true", () => {
      // arrange
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let revert = rewiredMain.__with__({
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
      let config = <PluginConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadReporter("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith("reporter", Sinon.match.any, Sinon.match.any);
    });

    it("should call loadPlugin with the program.reporter", () => {
      // arrange
      let config = <PluginConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadReporter("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call loadPlugin with a file spec of 'reporter-plugin'", () => {
      // arrange
      let config = <PluginConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadReporter("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "reporter-plugin");
    });

    it("should return the loaded reporter plugin", () => {
      // arrange
      let config = <PluginConfig> {name: "bar"};
      let expected = <PluginReporterWithConfig> {};
      (<SinonStub>mockUtil.getPlugin).returns(expected);

      // act
      let actual = lobo.loadReporter("foo", config);

      // assert
      expect(actual).to.equal(expected);
      expect(actual.config).to.equal(config);
    });
  });

  describe("loadTestFramework", () => {
    it("should call getPlugin with a type of 'testing framework'", () => {
      // arrange
      let config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadTestFramework("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith("testing framework", Sinon.match.any, Sinon.match.any);
    });

    it("should call getPlugin with the supplied pluginName", () => {
      // arrange
      let config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadTestFramework("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call getPlugin with a file spec of 'test-plugin'", () => {
      // arrange
      let config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns({});

      // act
      lobo.loadTestFramework("foo", config);

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "test-plugin");
    });

    it("should return the loaded test plugin", () => {
      // arrange
      let expected = <PluginTestFrameworkWithConfig> {};
      let config = <PluginTestFrameworkConfig> {name: "bar"};
      (<SinonStub>mockUtil.getPlugin).returns(expected);

      // act
      let actual = lobo.loadTestFramework("foo", config);

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
      let expected = {name: "abc"};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);

      // act
      let actual = lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz");

      // assert
      expect(actual).to.equal(expected);
    });

    it("should add the plugin options to the program option flags", () => {
      // arrange
      let expected = {name: "abc", options: [{flags: "def", description: "ghi"}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      let mockOption = Sinon.stub();
      let revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith("def", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should add the plugin options to the program option description", () => {
      // arrange
      let expected = {name: "abc", options: [{flags: "def", description: "ghi"}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      let mockOption = Sinon.stub();
      let revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith(Sinon.match.any, "ghi", Sinon.match.any, Sinon.match.any);
    });

    it("should add the plugin options to the program option parser", () => {
      // arrange
      let mockParser = Sinon.stub();
      let expected = {name: "abc", options: [{flags: "def", description: "ghi", parser: mockParser}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      let mockOption = Sinon.stub();
      let revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, mockParser, Sinon.match.any);
    });

    it("should add the plugin options to the program option default value", () => {
      // arrange
      let expected = {name: "abc", options: [{flags: "def", description: "ghi", defaultValue: 123}]};
      (<SinonStub>mockUtil.getPluginConfig).returns(expected);
      let mockOption = Sinon.stub();
      let revert = rewiredMain.__with__({program: {option: mockOption}});

      // act
      revert(() => lobo.loadPluginConfig({fileSpec: "foo", type: "bar"}, "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, 123);
    });

    it("should log an error when the plugin option does not have a flags property", () => {
      // arrange
      let expected = {name: "abc", options: [{description: "ghi"}]};
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
      let context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(undefined, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown general errors", () => {
      // arrange
      let error = new Error();
      let context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown reference errors", () => {
      // arrange
      let error = new ReferenceError();
      let context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown reference errors when stack trace does not exist", () => {
      // arrange
      let error = new ReferenceError();
      error.stack = undefined;
      let context = <ExecutionContext> {};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log reference errors due to 'findTests is not defined' correctly", () => {
      // arrange
      let error = new ReferenceError("ElmTest.Plugin$findTests is not defined");
      error.stack = "foo";
      let context = <ExecutionContext> {buildOutputFilePath: "foo"};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an npm upgrade to lobo: ");
    });

    it("should log unknown reference error for missing browser objects correctly", () => {
      // arrange
      let error = new ReferenceError();
      error.stack = "foo";
      let context = <ExecutionContext> {buildOutputFilePath: "foo"};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an elm package using objects that are found in the browser but not in a node process");
    });

    it("should log unknown type error for missing browser objects correctly", () => {
      // arrange
      let error = new TypeError();
      error.stack = "foo";
      let context = <ExecutionContext> {buildOutputFilePath: "foo"};

      // act
      lobo.handleUncaughtException(error, context);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an elm package using objects that are found in the browser but not in a node process");
    });

    it("should not ask for rerun with verbose option when verbose is set", () => {
      // arrange
      let error = new TypeError();
      error.stack = "foo";
      let context = <ExecutionContext> {buildOutputFilePath: "foo"};
      let revert = rewiredMain.__with__({program: {verbose: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockLogger.error).to.have.been.not.calledWith("Please rerun lobo with the --verbose option to see the cause of the error");
    });

    it("should not ask for rerun with verbose option when veryVerbose is set", () => {
      // arrange
      let error = new TypeError();
      error.stack = "foo";
      let context = <ExecutionContext> {buildOutputFilePath: "foo"};
      let revert = rewiredMain.__with__({program: {veryVerbose: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockLogger.error).to.have.been.not.calledWith("Please rerun lobo with the --verbose option to see the cause of the error");
    });

    it("should ask for rerun with verbose option when verbose is not set", () => {
      // arrange
      let error = new TypeError();
      error.stack = "foo";
      let context = <ExecutionContext> {buildOutputFilePath: "foo"};
      let revert = rewiredMain.__with__({program: {verbose: false}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Please rerun lobo with the --verbose option to see the cause of the error");
    });

    it("should not exit the process when there is an error and in watch mode", () => {
      // arrange
      let error = new Error();
      let context = <ExecutionContext> {config: {}};
      let revert = rewiredMain.__with__({program: {watch: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockExit).not.to.have.been.called;
    });

    it("should exit the process with exitCode 1 when there is an error and not in watch mode", () => {
      // arrange
      let error = new Error();
      let context = <ExecutionContext> {};
      let revert = rewiredMain.__with__({program: {watch: false}});

      // act
      revert(() => lobo.handleUncaughtException(error, context));

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });
  });
});
