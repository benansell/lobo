"use strict";

import * as bluebird from "bluebird";
import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as sinonChai from "sinon-chai";
import {createLobo, Lobo, LoboImp} from "../../../lib/main";
import {Builder} from "../../../lib/builder";
import {ElmPackageHelper} from "../../../lib/elm-package-helper";
import {Logger} from "../../../lib/logger";
import {Runner} from "../../../lib/runner";
import {Util} from "../../../lib/util";
import {LoboConfig, PluginReporterWithConfig, PluginTestFrameworkWithConfig} from "../../../lib/plugin";
import p = require("proxyquire");


let expect = chai.expect;
chai.use(sinonChai);

describe("lib main", () => {
  let rewiredMain = rewire("../../../lib/main");
  let rewiredImp;
  let lobo: LoboImp;
  let mockBuilder: Builder;
  let mockExit: () => void;
  let mockHelper: ElmPackageHelper;
  let mockLogger: Logger;
  let mockRunner: Runner;
  let mockUtil: Util;

  let revertExit: () => void;

  beforeEach(() => {
    mockExit = Sinon.stub();
    revertExit = rewiredMain.__set__({process: { exit: mockExit}});
    rewiredImp = rewiredMain.__get__("LoboImp");
    mockBuilder = <Builder> { build: Sinon.stub()};
    mockHelper = <ElmPackageHelper><{}> {read: Sinon.stub()};
    mockLogger = <Logger> { debug: Sinon.stub(), error: Sinon.stub(), info: Sinon.stub(),
      trace: Sinon.stub(), warn: Sinon.stub()};
    mockRunner = <Runner> { run: Sinon.stub()};
    mockUtil = <Util><{}> { availablePlugins: Sinon.stub(), checkNodeVersion: Sinon.stub(), getPlugin: Sinon.stub(), getPluginConfig: Sinon.stub(), padRight: Sinon.stub(), unsafeLoad: Sinon.stub()};

    lobo = new rewiredImp(mockBuilder, mockHelper, mockLogger, mockRunner, mockUtil, false, false, false);
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

  describe("generateTestFileName", () => {
    it("should return a file name with 'lobo-test-' prefix", () => {
      // act
      let actual = LoboImp.generateTestFileName();

      // assert
      expect(actual).to.match(/\/lobo-test.+\.js$/);
    });

    it("should return a js file name", () => {
      // act
      let actual = LoboImp.generateTestFileName();

      // assert
      expect(actual).to.match(/.js$/);
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
      lobo.validateConfiguration = Sinon.spy();

      // act
      lobo.execute();

      // assert
      expect(lobo.validateConfiguration).to.have.been.called;
    });

    it("should call watch with config when program.watch is true", () => {
      // arrange
      let expected = <LoboConfig> {};
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).returns(expected);
      lobo.validateConfiguration = Sinon.stub();
      lobo.watch = Sinon.spy();
      let revert = rewiredMain.__with__({program: {watch: true}});

      // act
      revert(() => lobo.execute());

      // assert
      expect(lobo.watch).to.have.been.calledWith(expected)
    });

    it("should call launch with config when program.watch is false", () => {
      // arrange
      let expected = <LoboConfig> {};
      lobo.configure = Sinon.stub();
      (<SinonStub>lobo.configure).returns(expected);
      lobo.validateConfiguration = Sinon.stub();
      lobo.launch = Sinon.spy();
      let revert = rewiredMain.__with__({program: {watch: false}});

      // act
      revert(() => lobo.execute());

      // assert
      expect(lobo.launch).to.have.been.calledWith(expected)
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

  describe("launch", () => {
    it("should call builder.build with the config", () => {
      // arrange
      let expected = <LoboConfig> {};

      // act
      let actual = lobo.launch(expected);

      // assert
      actual.then(() => {
        expect(mockBuilder.build).to.have.been.calledWith(expected, Sinon.match.any);
      });
    });

    it("should call builder.build with the test directory", () => {
      // arrange
      let expected = <LoboConfig> {};
      let revert = rewiredMain.__with__({program: {testDirectory: "foo"}});

      // act
      let actual: bluebird<void> = undefined;
      revert(() => actual = lobo.launch(expected));

      // assert
      actual.then(() => {
        expect(mockBuilder.build).to.have.been.calledWith(Sinon.match.any, "foo");
      });
    });

    it("should call runner.run with the config", () => {
      // arrange
      let expected = <LoboConfig> {};

      // act
      let actual = lobo.launch(expected);

      // assert
      actual.then(() => {
        expect(mockRunner.run).to.have.been.calledWith(expected);
      });
    });

    it("should not call done with the config when watch is false", () => {
      // arrange
      let expected = <LoboConfig> {};
      let revert = rewiredMain.__with__({program: {watch: false}});
      lobo.done = Sinon.spy();

      // act
      let actual: bluebird<void> = undefined;
      revert(() => actual = lobo.launch(expected));

      // assert
      actual.then(() => {
        expect(lobo.done).not.to.have.been.called;
      })
    });

    it("should call done with the config when watch is true", () => {
      // arrange
      let expected = <LoboConfig> {};
      let revert = rewiredMain.__with__({program: {watch: true}});
      lobo.done = Sinon.spy();

      // act
      let actual: bluebird<void> = undefined;
      revert(() => actual = lobo.launch(expected));

      // assert
      actual.then(() => {
        expect(lobo.done).to.have.been.calledWith(expected);
      });
    });

    it("should call process.exit with exitCode of 1 when an error is thrown and watch is false", () => {
      // arrange
      (<SinonStub>mockBuilder.build).throws(new Error());
      let revert = rewiredMain.__with__({program: {watch: false}});

      // act
      let actual: bluebird<void> = undefined;
      revert(() => actual = lobo.launch(<LoboConfig>{}));

      // assert
      actual.then(() => {
        expect(mockExit).to.have.been.calledWith(1);
      });
    });

    it("should call done with the config when an error is thrown and watch is false", () => {
      // arrange
      let expected = <LoboConfig> {};
      (<SinonStub>mockBuilder.build).throws(new Error());
      let revert = rewiredMain.__with__({program: {watch: true}});
      lobo.done = Sinon.spy();

      // act
      let actual: bluebird<void> = undefined;
      revert(() => actual = lobo.launch(expected));

      // assert
      actual.then(() => {
        expect(lobo.done).to.have.been.calledWith(expected);
        expect(mockExit).not.to.have.been.called;
      });
    });

    it("should call handleUncaughtException when an ReferenceError is thrown", () => {
      // arrange
      let expected = new ReferenceError();
      (<SinonStub>mockBuilder.build).throws(expected);
      lobo.handleUncaughtException = Sinon.spy();

      // act
      let actual = lobo.launch(<LoboConfig>{});

      // assert
      actual.then(() => {
        expect(lobo.handleUncaughtException).to.have.been.calledWith(expected);
      });
    });

    it("should log Debug.crash errors to the logger", () => {
      // arrange
      let expected = new Error("Ran into a `Debug.crash` in module");
      (<SinonStub>mockBuilder.build).throws(expected);
      lobo.handleUncaughtException = Sinon.spy();

      // act
      let actual = lobo.launch(<LoboConfig>{});

      // assert
      actual.then(() => {
        expect(mockLogger.error).to.have.been.calledWith(expected);
      });
    });
  });

  describe("done", () => {
    it("should call launch when waiting is true", () => {
      // arrange
      let expected = <LoboConfig> {};
      lobo = new rewiredImp(mockBuilder, mockHelper, mockLogger, mockRunner, mockUtil, false, false, true);
      lobo.launch = Sinon.spy();

      // act
      lobo.done(expected);

      // assert
      expect(lobo.launch).to.have.been.calledWith(expected);
    });

    it("should not call launch when waiting is false", () => {
      // arrange
      let expected = <LoboConfig> {};
      lobo = new rewiredImp(mockBuilder, mockHelper, mockLogger, mockRunner, mockUtil, false, false, false);
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
      mockWatch.returns({ on: mockOn});

      revertWatch = rewiredMain.__set__({chokidar: {watch: mockWatch}});
    });

    afterEach(() => {
      revertWatch();
    });

    it("should watch the root elm-package.json", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};

      // act
      lobo.watch(config);

      // assert
      expect(mockWatch.firstCall.args[0]).to.include("./elm-package.json");
    });

    it("should watch paths excluding elm-stuff directory", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};

      // act
      lobo.watch(config);

      // assert
      let ignored = mockWatch.firstCall.args[1].ignored;
      expect(ignored.test("/elm-stuff/")).to.be.true;
    });

    it("should watch the directories in the test elm-package json", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};
      (<SinonStub>mockHelper.read).returns({ sourceDirectories: [".", "../src"]});
      let revert = rewiredMain.__with__({process: { cwd: () => "./" }, program: {testDirectory: "./test"}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.watch(config));

      // assert
      expect(mockWatch.firstCall.args[0]).to.include('src');
      expect(mockWatch.firstCall.args[0]).to.include('test');
    });

    it("should call launch with supplied config when 'ready' event is received", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};
      lobo.launch = Sinon.spy();
      mockOn.callsFake((event, func) => {
        if(event === "ready") {
          func();
        }

        return {on: mockOn};
      });

      // act
      lobo.watch(config);

      // assert
      expect(lobo.launch).to.have.been.calledWith(config);
    });

    it("should not call launch with supplied config when 'all' event is received and ready is false", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};
      mockOn.callsFake((event, func) => {
        if(event === "all") {
          func();
        }

        return {on: mockOn};
      });

      lobo = new rewiredImp(mockBuilder, mockHelper, mockLogger, mockRunner, mockUtil, false, false, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.watch(config);

      // assert
      expect(lobo.launch).not.to.have.been.called;
    });

    it("should not call launch with supplied config when 'all' event is received and ready is true and busy is true", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};
      mockOn.callsFake((event, func) => {
        if(event === "all") {
          func();
        }

        return {on: mockOn};
      });

      lobo = new rewiredImp(mockBuilder, mockHelper, mockLogger, mockRunner, mockUtil, true, true, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.watch(config);

      // assert
      expect(lobo.launch).not.to.have.been.called;
    });

    it("should call launch with supplied config when 'all' event is received and ready is true", () => {
      // arrange
      let config = <LoboConfig> { testFile: "foo"};
      mockOn.callsFake((event, func) => {
        if(event === "all") {
          func();
        }

        return {on: mockOn};
      });

      lobo = new rewiredImp(mockBuilder, mockHelper, mockLogger, mockRunner, mockUtil, false, true, false);
      lobo.launch = Sinon.spy();

      // act
      lobo.watch(config);

      // assert
      expect(lobo.launch).to.have.been.calledWith(config);
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
      revertProcess = rewiredMain.__set__({process: { argv: []}});
      mockAllowUnknownOption = Sinon.stub();
      mockOn = Sinon.stub();
      mockOption = Sinon.stub();
      mockOpts = Sinon.stub();
      mockParse = Sinon.stub();
      mockVersion = Sinon.stub();
      
      programMocks = { allowUnknownOption: mockAllowUnknownOption, on: mockOn, option: mockOption, opts: mockOpts, parse: mockParse, version: mockVersion};
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

    it("should return config with reporter set to the value returned from loadReporter", () => {
      // arrange
      let expected = <PluginReporterWithConfig> { config: {name: "foo"}};
      lobo.loadReporter = Sinon.stub();
      (<SinonStub>lobo.loadReporter).returns(expected);

      // act
      let actual = lobo.configure();

      // assert
      expect(actual.reporter).to.equal(expected);
    });

    it("should return config with testFramework set to the value returned from loadTestFramework", () => {
      // arrange
      let expected = <PluginTestFrameworkWithConfig> { config: {name: "foo"}};
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
      (<{debug: boolean}>programMocks).debug = false;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      revert(() => lobo.configure());

      // assert
      expect(mockCleanup).to.have.been.called;
    });

    it("should not set cleanup of temp files when debug option is true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{debug: boolean}>programMocks).debug = true;
      let revert = rewiredMain.__with__({program: programMocks, tmp: {setGracefulCleanup: mockCleanup}});

      // act
      revert(() => lobo.configure());

      // assert
      expect(mockCleanup).not.to.have.been.called;
    });

    it("should convert program prompt 'y' to true", () => {
      // arrange
      let mockCleanup = Sinon.stub();
      (<{prompt: string}>programMocks).prompt = "y";
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
      (<{prompt: string}>programMocks).prompt = "Y";
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
      (<{prompt: string}>programMocks).prompt = "yes";
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
      (<{verbose: boolean}>programMocks).verbose = false;
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
      (<{verbose: boolean}>programMocks).verbose = true;
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
      (<{veryVerbose: boolean}>programMocks).veryVerbose = false;
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
      (<{veryVerbose: boolean}>programMocks).veryVerbose = true;
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
      (<{prompt: string}>programMocks).prompt = "Yes";
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
      (<{prompt: string}>programMocks).prompt = "n";
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
      (<{prompt: string}>programMocks).prompt = "N";
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
      (<{prompt: string}>programMocks).prompt = "no";
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
      (<{prompt: string}>programMocks).prompt = "No";
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
      (<{compiler: string}>programMocks).compiler = "foo";
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
      (<{compiler: string}>programMocks).compiler = "foo/../bar";
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
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith("testing framework", Sinon.match.any, Sinon.match.any);
    });

    it("should call showCustomHelpForPlugins with 'test-plugin'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith(Sinon.match.any, "test-plugin", Sinon.match.any);
    });

    it("should call showCustomHelpForPlugins with max option length of 29", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, 29);
    });

    it("should call showCustomHelpForPlugins with 'testing framework'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith("reporter", Sinon.match.any, Sinon.match.any);
    });

    it("should call showCustomHelpForPlugins with 'test-plugin'", () => {
      // arrange
      lobo.showCustomHelpForPlugins = Sinon.stub();

      // act
      lobo.showCustomHelp();

      // assert
      expect(lobo.showCustomHelpForPlugins).to.have.been.calledWith(Sinon.match.any, "reporter-plugin", Sinon.match.any);
    });
  });

  describe("showCustomHelpForPlugins", () => {
    it("should get the available plugins from calling util.availablePlugins with the supplied file spec", () => {
      // act
      lobo.showCustomHelpForPlugins("foo", "bar", 123);

      // assert
      expect(mockUtil.availablePlugins).to.have.been.calledWith("bar");
    });

    it("should get the config for each available plugin by calling util.getPluginConfig with the plugin name", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc", "def"]);

      // act
      lobo.showCustomHelpForPlugins("foo", "bar", 123);


      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, "abc", Sinon.match.any);
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, "def", Sinon.match.any);
    });

    it("should get the config for each available plugin by calling util.getPluginConfig with the supplied type", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc", "def"]);

      // act
      lobo.showCustomHelpForPlugins("foo", "bar", 123);


      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should get the config for each available plugin by calling util.getPluginConfig with the file spec", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc", "def"]);

      // act
      lobo.showCustomHelpForPlugins("foo", "bar", 123);


      // assert
      expect(mockUtil.getPluginConfig).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "bar");
    });

    it("should log the config.options for each available plugin", () => {
      // arrange
      (<SinonStub>mockUtil.availablePlugins).returns(["abc"]);
      (<SinonStub>mockUtil.getPluginConfig).returns({options: [{flags: "def", description: "ghi"}]});
      (<SinonStub>mockUtil.padRight).callsFake(x => x + " ");

      // act
      lobo.showCustomHelpForPlugins("foo", "bar", 123);

      // assert
      expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/def.*ghi/));
    });
  });

  describe("validateConfiguration", () => {
    it("should log an error when the elm compiler cannot be found", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: () => false}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unable to find the elm compiler");
    });

    it("should call process.exit with an exitCode of 1 when the elm compiler cannot be found", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: () => false}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error when the Tests.elm file cannot be found in the test directory", () => {
      // arrange
      let fakeTest = (flags, fileName) => fileName !== "bar/Tests.elm";
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: fakeTest}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unable to find \"Tests.elm\"");
    });

    it("should call process.exit with an exitCode of 1 when the Tests.elm file cannot be found in the test directory", () => {
      // arrange
      let fakeTest = (flags, fileName) => fileName !== "bar/Tests.elm";
      let revert = rewiredMain.__with__({program: {compiler: "foo", testDirectory: "bar"}, shelljs: {test: fakeTest}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should log an error when the test framework is elm-test and showSkip is true", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {framework: "elm-test", showSkip: true}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Invalid configuration combination");
    });

    it("should not log an error when the test framework is elm-test and showSkip is false", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {framework: "elm-test", showSkip: false}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockLogger.error).not.to.have.been.calledWith("Invalid configuration combination");
    });

    it("should call process.exit with an exitCode of 1 when the test framework is elm-test and showSkip is true", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {framework: "elm-test", showSkip: true}, shelljs: {test: () => true}});

      // act
      revert(() => lobo.validateConfiguration());

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });
  });

  describe("loadReporter", () => {
    it("should call loadPlugin with a type of 'reporter'", () => {
      // arrange
      lobo.loadPlugin = Sinon.spy();

      // act
      lobo.loadReporter();

      // assert
      expect(lobo.loadPlugin).to.have.been.calledWith("reporter", Sinon.match.any, Sinon.match.any);
    });

    it("should call loadPlugin with the program.reporter", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {reporter: "foo"}});
      lobo.loadPlugin = Sinon.spy();

      // act
      revert(() => lobo.loadReporter());

      // assert
      expect(lobo.loadPlugin).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call loadPlugin with a file spec of 'reporter-plugin'", () => {
      // arrange
      lobo.loadPlugin = Sinon.spy();

      // act
      lobo.loadReporter();

      // assert
      expect(lobo.loadPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "reporter-plugin");
    });

    it("should return the loaded reporter plugin", () => {
      // arrange
      let expected = <PluginReporterWithConfig> { config: {name: "foo"}};
      lobo.loadPlugin = Sinon.stub();
      (<SinonStub>lobo.loadPlugin).returns(expected);

      // act
      let actual = lobo.loadReporter();

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("loadTestFramework", () => {
    it("should call loadPlugin with a type of 'testing framework'", () => {
      // arrange
      lobo.loadPlugin = Sinon.spy();

      // act
      lobo.loadTestFramework();

      // assert
      expect(lobo.loadPlugin).to.have.been.calledWith("testing framework", Sinon.match.any, Sinon.match.any);
    });

    it("should call loadPlugin with the program.framework", () => {
      // arrange
      let revert = rewiredMain.__with__({program: {framework: "foo"}});
      lobo.loadPlugin = Sinon.spy();

      // act
      revert(() => lobo.loadTestFramework());

      // assert
      expect(lobo.loadPlugin).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call loadPlugin with a file spec of 'test-plugin'", () => {
      // arrange
      lobo.loadPlugin = Sinon.spy();

      // act
      lobo.loadTestFramework();

      // assert
      expect(lobo.loadPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "test-plugin");
    });

    it("should return the loaded test plugin", () => {
      // arrange
      let expected = <PluginTestFrameworkWithConfig> { config: {name: "foo"}};
      lobo.loadPlugin = Sinon.stub();
      (<SinonStub>lobo.loadPlugin).returns(expected);

      // act
      let actual = lobo.loadTestFramework();

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("loadPlugin", () => {
    it("should call util.getPlugin with the supplied type", () => {
      // act
      lobo.loadPlugin("foo", "bar", "baz");

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call util.getPlugin with the supplied pluginName", () => {
      // act
      lobo.loadPlugin("foo", "bar", "baz");

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
    });

    it("should call util.getPlugin with the supplied fileSpec", () => {
      // act
      lobo.loadPlugin("foo", "bar", "baz");

      // assert
      expect(mockUtil.getPlugin).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz");
    });

    it("should return the plugin loaded by util.getPlugin", () => {
      // arrange
      let expected = {config: {name: "abc"}};
      (<SinonStub>mockUtil.getPlugin).returns(expected);

      // act
      let actual = lobo.loadPlugin("foo", "bar", "baz");

      // assert
      expect(actual).to.equal(expected);
    });

    it("should add the plugin options to the program options", () => {
      // arrange
      let expected = {config: {name: "abc", options: [{flags: "def", description: "ghi"}]}};
      (<SinonStub>mockUtil.getPlugin).returns(expected);
      let mockOption = Sinon.stub();
      let revert = rewiredMain.__with__({program: { option: mockOption}});

      // act
      revert(() => lobo.loadPlugin("foo", "bar", "baz"));

      // assert
      expect(mockOption).to.have.been.calledWith("def", "ghi");
    });

    it("should log an error when the plugin option does not have a flags property", () => {
      // arrange
      let expected = {config: {name: "abc", options: [{description: "ghi"}]}};
      (<SinonStub>mockUtil.getPlugin).returns(expected);

      // act
      lobo.loadPlugin("foo", "bar", "baz");

      // assert
      expect(mockLogger.error).to.have.been.called;
    });
  });

  describe("handleUncaughtException", () => {
    it("should log undefined error", () => {
      // arrange
      let config = <LoboConfig> {};

      // act
      lobo.handleUncaughtException(undefined, config);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown general errors", () => {
      // arrange
      let error = new Error();
      let config = <LoboConfig> {};

      // act
      lobo.handleUncaughtException(error, config);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown reference errors", () => {
      // arrange
      let error = new ReferenceError();
      let config = <LoboConfig> {};

      // act
      lobo.handleUncaughtException(error, config);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log unknown reference errors when stack trace does not exist", () => {
      // arrange
      let error = new ReferenceError();
      error.stack = undefined;
      let config = <LoboConfig> {};

      // act
      lobo.handleUncaughtException(error, config);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Unhandled exception", Sinon.match.any);
    });

    it("should log reference errors due to 'findTests is not defined' correctly", () => {
      // arrange
      let error = new ReferenceError("ElmTest.Plugin$findTests is not defined");
      error.stack = "foo";
      let config = <LoboConfig> { testFile: "foo"};

      // act
      lobo.handleUncaughtException(error, config);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an npm upgrade to lobo: ");
    });

    it("should log unknown reference error for missing browser objects correctly", () => {
      // arrange
      let error = new ReferenceError();
      error.stack = "foo";
      let config = <LoboConfig> { testFile: "foo"};

      // act
      lobo.handleUncaughtException(error, config);

      // assert
      expect(mockLogger.error).to.have.been.calledWith("Error running the tests. This is usually " +
        "caused by an elm package using objects that are found in the browser but not in a node process");
    });

    it("should not exit the process when there is an error and in watch mode", () => {
      // arrange
      let error = new Error();
      let config = <LoboConfig> {};
      let revert = rewiredMain.__with__({program: {watch: true}});

      // act
      revert(() => lobo.handleUncaughtException(error, config));

      // assert
      expect(mockExit).not.to.have.been.called;
    });

    it("should exit the process with exitCode 1 when there is an error and not in watch mode", () => {
      // arrange
      let error = new Error();
      let config = <LoboConfig> {};
      let revert = rewiredMain.__with__({program: {watch: false}});

      // act
      revert(() => lobo.handleUncaughtException(error, config));

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });
  });
});
