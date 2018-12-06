"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {LoboConfig, Reject, Resolve} from "../../../lib/plugin";
import {createElmCommandRunner, ElmCommandRunner, ElmCommandRunnerImp} from "../../../lib/elm-command-runner";
import {Logger} from "../../../lib/logger";
import {Util} from "../../../lib/util";

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib elm-command-runner", () => {
  const RewiredCommandRunner = rewire("../../../lib/elm-command-runner");
  let commandRunner: ElmCommandRunnerImp;
  let mockChildOn: Sinon.SinonStub;
  let mockChildStdOutOn: Sinon.SinonStub;
  let mockChildWrite: Sinon.SinonStub;
  let mockSpawn: Sinon.SinonStub;
  let mockProcessWrite: Sinon.SinonStub;
  let mockReject: Reject;
  let mockResolve: Resolve<void>;
  let mockLogger: Logger;
  let mockUtil: Util;
  let mockLogStage: Sinon.SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.error = Sinon.spy();
    mockLogger.trace = Sinon.spy();

    mockUtil = <Util> {};
    mockLogStage = Sinon.stub();
    mockUtil.logStage = mockLogStage;

    mockChildOn = Sinon.stub();
    mockChildStdOutOn = Sinon.stub();
    mockChildWrite = Sinon.stub();
    mockSpawn = Sinon.stub().returns({on: mockChildOn, stdin: {write: mockChildWrite}, stdout: {on: mockChildStdOutOn}});
    mockProcessWrite = Sinon.stub();

    revert = RewiredCommandRunner.__set__({
      childProcess: {spawn: mockSpawn}, console: {log: Sinon.stub()},
      process: {stdout: {write: mockProcessWrite}}
    });
    const rewiredImp = RewiredCommandRunner.__get__("ElmCommandRunnerImp");
    commandRunner = new rewiredImp(mockLogger, mockUtil);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
  });

  afterEach(() => {
    revert();
  });

  describe("createElmCommandRunner", () => {
    it("should return elm command runner", () => {
      // act
      const actual: ElmCommandRunner = createElmCommandRunner();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("init", () => {
    it("should call runElmCommand to init with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.init(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand to init with the supplied prompt", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.init(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, true, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand to init with the supplied directory", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.init(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to init the app with the init action", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.init(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/^init/), Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to init the app with the supplied resolve", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.init(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, mockResolve, Sinon.match.any);
    });

    it("should call util.runElmCommand to init the app with the supplied reject", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.init(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, mockReject);
    });
  });

  describe("install", () => {
    it("should call runElmCommand to install with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand to install with the supplied prompt", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, true, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand to install with the supplied lobo directory", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to install the app with the install action", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/^install/), Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to install the app with the supplied package name", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "install bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to install the app with the supplied resolve", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, mockResolve, Sinon.match.any);
    });

    it("should call util.runElmCommand to install the app with the supplied reject", () => {
      // arrange
      const config = <LoboConfig> {};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.install(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, mockReject);
    });
  });

  describe("make", () => {
    it("should call runElmCommand with the supplied context", () => {
      // arrange
      const config = <LoboConfig> {compiler: "abc"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with the supplied prompt value", () => {
      // arrange
      const config = <LoboConfig> {compiler: "abc"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, true, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, true, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with the supplied loboDirectory", () => {
      // arrange
      const config = <LoboConfig> {compiler: "abc", loboDirectory: "foo"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with the action 'make'", () => {
      // arrange
      const config = <LoboConfig> {compiler: "abc"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/^make /), Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with the supplied testSuiteOutputFilePath", () => {
      // arrange
      const config = <LoboConfig> {compiler: "abc"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/ bar /), Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with the specified output file path", () => {
      // arrange
      const config = <LoboConfig> {compiler: "abc"};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/--output=baz/), Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand without --optimize when config.optimize is false", () => {
      // arrange
      const config = <LoboConfig> {optimize: false};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      const optimizeMatch = Sinon.match((x) => x.indexOf("--optimize") === -1);
      expect(commandRunner.runElmCommand).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, optimizeMatch, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with --optimize when config.optimize is true and hasDebugUsage is false", () => {
      // arrange
      const config = <LoboConfig> {optimize: true};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/ --optimize/), Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand without --optimize when config.optimize is true and hasDebugUsage is true", () => {
      // arrange
      const config = <LoboConfig> {optimize: true};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).not.to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/ --optimize/), Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand without --optimize when config.optimize is false and hasDebugUsage is true", () => {
      // arrange
      const config = <LoboConfig> {optimize: true};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).not.to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match(/ --optimize/), Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmCommand with the supplied resolve", () => {
      // arrange
      const config = <LoboConfig> {optimize: true};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, mockResolve, Sinon.match.any);
    });

    it("should call runElmCommand with the supplied reject", () => {
      // arrange
      const config = <LoboConfig> {optimize: true};
      commandRunner.runElmCommand = Sinon.stub();

      // act
      commandRunner.make(config, false, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(commandRunner.runElmCommand).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, mockReject);
    });
  });

  describe("runElmCommand", () => {
    it("should call elm from the current directory when compiler is not supplied", () => {
      // arrange
      const config = <LoboConfig> {};

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockSpawn).to.have.been.calledWith(Sinon.match(/^elm/), Sinon.match.any, Sinon.match.any);
    });

    it("should call elm from the supplied compiler directory", () => {
      // arrange
      const mockJoin = Sinon.stub().callsFake((x, y) => x + "/" + y);
      const revertPath = RewiredCommandRunner.__with__({path: {join: mockJoin}});
      const config = <LoboConfig> {compiler: "foo"};

      // act
      revertPath(() => commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject));

      // assert
      expect(mockSpawn).to.have.been.calledWith(Sinon.match(/^foo\/elm/), Sinon.match.any, Sinon.match.any);
    });

    it("should call elm with the supplied action", () => {
      // arrange
      const config = <LoboConfig> {};


      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockSpawn).to.have.been.calledWith(Sinon.match.any, Sinon.match.array.deepEquals(["baz"]), Sinon.match.any);
    });

    it("should call elm with cwd as supplied directory", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockSpawn).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(x => x.cwd === "bar"));
    });

    it("should call process.stdout.write with messages from the child process", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildStdOutOn.callsFake((event, cb) => {
        if (event === "data") {
          cb("qux");
        }
      });

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockProcessWrite).to.have.been.calledWith("qux");
    });

    it("should call process.stdout.write with messages from the child process", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildStdOutOn.callsFake((event, cb) => {
        if (event === "data") {
          cb("qux");
        }
      });

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockProcessWrite).to.have.been.calledWith("qux");
    });

    it("should not output automatic response to child when prompt is true and message is a question", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};

      // act
      commandRunner.runElmCommand(config, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockChildWrite).not.to.have.been.called;
    });

    it("should not output automatic response when prompt is false and message is undefined", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildStdOutOn.callsFake((event, cb) => {
        if (event === "data") {
          cb(undefined);
        }
      });

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockChildWrite).not.to.have.been.called;
    });

    it("should not output automatic response of 'y\n' to child when prompt is false and message is not a question", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildStdOutOn.callsFake((event, cb) => {
        if (event === "data") {
          cb("qux : ");
        }
      });

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockChildWrite).not.to.have.been.called;
    });

    it("should output automatic response of 'y\n' to child when prompt is false and message is a question", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildStdOutOn.callsFake((event, cb) => {
        if (event === "data") {
          cb("qux [Y/n]: ");
        }
      });

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockChildWrite).to.have.been.calledWith("y\n");
    });

    it("should output automatic response of 'y\n' to process when prompt is false and message is a question", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildStdOutOn.callsFake((event, cb) => {
        if (event === "data") {
          cb("qux [Y/n]: ");
        }
      });

      // act
      commandRunner.runElmCommand(config, false, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockProcessWrite).to.have.been.calledWith("y\n");
    });

    it("should call the supplied resolve on 'close' message with exitCode of zero", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildOn.callsFake((event, cb) => {
        if (event === "close") {
          cb(0);
        }
      });

      // act
      commandRunner.runElmCommand(config, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should call the supplied reject on 'close' message with exitCode of non zero", () => {
      // arrange
      const config = <LoboConfig> {compiler: "foo"};
      mockChildOn.callsFake((event, cb) => {
        if (event === "close") {
          cb(1);
        }
      });

      mockReject = (err) => expect(err.toString()).to.equal("Error: Build Failed");

      // act
      commandRunner.runElmCommand(config, true, "bar", "baz", mockResolve, mockReject);

      // assert
      expect(mockResolve).not.to.have.been.called;
    });
  });
});
