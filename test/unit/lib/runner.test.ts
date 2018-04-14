"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {SinonStub} from "sinon";
import {Logger} from "../../../lib/logger";
import {createRunner, NodeProcessStdout, Runner, RunnerImp} from "../../../lib/runner";
import {Reporter} from "../../../lib/reporter";
import {ExecutionContext, LoboConfig, PluginReporter, PluginTestFramework, ProgressReport, TestReportRoot} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib runner", () => {
  let RewiredRunner = rewire("../../../lib/runner");
  let runner: RunnerImp;
  let mockLogger: Logger;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;
  let mockReporter: Reporter;
  let mockStdout: NodeProcessStdout;
  let revertRunner;

  beforeEach(() => {
    revertRunner = RewiredRunner.__set__({process: {stdout: { write: Sinon.spy()}} });
    let rewiredImp = RewiredRunner.__get__("RunnerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockStdout = <NodeProcessStdout> {};
    mockStdout.write = Sinon.spy();
    mockReporter = <Reporter> {};
    runner = new rewiredImp(mockLogger, mockReporter);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
  });

  afterEach(() => {
    revertRunner();
  });

  describe("createRunner", () => {
    it("should return runner", () => {
      // act
      let actual: Runner = createRunner();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("loadElmTestApp", () => {
    it("should the loaded elm test app", () => {
      // act
      let actual = runner.loadElmTestApp("./runner", mockLogger);

      // assert
      expect(actual).to.exist;
    });

    it("should throw an error when the elm test app is not found", () => {
      expect(() => runner.loadElmTestApp("./foo", mockLogger)).to.throw("Cannot find module './foo'");
    });
  });

  describe("makeTestRunBegin", () => {
    it("should return a function that calls reporter.init with the supplied testCount", () => {
      // arrange
      mockReporter.init = Sinon.spy();

      // act
      let actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockReporter.init).to.have.been.calledWith(123);
    });

    it("should return a function that calls supplied reject when an error is thrown", () => {
      // arrange
      let expected = new Error("foo");
      mockReporter.init = () => {
        throw expected;
      };

      // act
      let actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });

    it("should return a function that set stdout.write to originalNodeProcessWrite when an error is thrown", () => {
      // arrange
      let expected = new Error("foo");
      mockReporter.init = () => {
        throw expected;
      };
      let mockWrite = Sinon.spy();
      mockStdout.write = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = mockWrite;

      // act
      let actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockStdout.write).to.equal(mockWrite);
    });

    it("should set the originalNodeProcessWrite to value of stdout.write", () => {
      // arrange
      mockReporter.init = Sinon.spy();
      let mockWrite = Sinon.spy();
      mockStdout.write = mockWrite;

      // act
      let actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(RunnerImp.originalNodeProcessWrite).to.equal(mockWrite);
    });

    it("should set stdout.write to RunnerImp.testRunStdOutWrite", () => {
      // arrange
      mockReporter.init = Sinon.spy();
      let mockWrite = Sinon.spy();
      mockStdout.write = mockWrite;

      // act
      let actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockStdout.write).to.equal(RunnerImp.testRunStdOutWrite);
    });

    it("should initialize the debugLogMessage list to an empty array", () => {
      // arrange
      mockReporter.init = Sinon.spy();
      RunnerImp.debugLogMessages = ["foo"];

      // act
      let actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(RunnerImp.debugLogMessages).to.be.empty;
    });
  });

  describe("makeTestRunProgress", () => {
    it("should return a function that calls reporter.update with the supplied progress report", () => {
      // arrange
      mockReporter.update = Sinon.spy();
      let expected = <ProgressReport> {reason: "foobar"};

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.update).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should return a function that calls reporter.update with the accumulated Debug.log messages", () => {
      // arrange
      mockReporter.update = Sinon.spy();
      let progressReport = <ProgressReport> {reason: "foobar"};
      let expected = ["baz"];
      RunnerImp.debugLogMessages = expected;

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(progressReport);

      // assert
      expect(mockReporter.update).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return a function that calls supplied reject when an error is thrown", () => {
      // arrange
      let expected = new Error("foo");
      mockReporter.update = () => {
        throw expected;
      };

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });

    it("should return a function that set stdout.write to originalNodeProcessWrite when an error is thrown", () => {
      // arrange
      let expected = new Error("foo");
      mockReporter.update = () => {
        throw expected;
      };
      let mockWrite = Sinon.spy();
      mockStdout.write = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = mockWrite;

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockStdout.write).to.equal(mockWrite);
    });

    it("should return a function that restore stdout.write to the original value before calling reporter.update", () => {
      // arrange
      let original = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = original;

      mockReporter.update = Sinon.stub();
      (<SinonStub>mockReporter.update).callsFake(() => {
        expect(mockStdout.write).to.equal(original);
      });

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(<ProgressReport> {});

      // assert -- see arrange
    });

    it("should return a function that leaves stdout.write set to testRunStdOutWrite after it has been called", () => {
      // arrange
      let original = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = original;
      mockReporter.update = Sinon.stub();

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockStdout.write).to.equal(RunnerImp.testRunStdOutWrite);
    });

    it("should return a function that clears the debugLogMessages after it has been called", () => {
      // arrange
      RunnerImp.debugLogMessages = ["foo"];
      mockReporter.update = Sinon.stub();

      // act
      let actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(RunnerImp.debugLogMessages).to.be.empty;
    });
  });

  describe("makeTestRunComplete", () => {
    it("should return a function that calls reporter.finish with the supplied results", () => {
      // arrange
      let context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.finish).to.have.been.calledWith(expected);
    });

    it("should return a function that calls resolve when reporter.finish is true", () => {
      // arrange
      let context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should return a function that calls reject when reporter.finish throws error", () => {
      // arrange
      let context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: () => {
          return {"catch": func => func()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReject).to.have.been.calledWith();
    });

    it("should return a function that set stdout.write to originalNodeProcessWrite when an error is thrown", () => {
      // arrange
      let context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: () => {
          return {"catch": func => func()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};
      let mockWrite = Sinon.spy();
      mockStdout.write = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = mockWrite;

      // act
      let actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockStdout.write).to.equal(mockWrite);
    });

    it("should return a function that resets the stdout.write to the originalNodeProcessWrite value", () => {
      // arrange
      let context = <ExecutionContext> {config: {}};
      let original = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = original;
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });

      // act
      let actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(<TestReportRoot> {runType: "NORMAL"});

      // assert
      expect(mockStdout.write).to.equal(original);
    });
  });

  describe("testRunStdOutWrite", () => {
    it("should add supplied message to the debugLogMessages list", () => {
      // arrange
      RunnerImp.debugLogMessages = [];

      // act
      RunnerImp.testRunStdOutWrite("foo");

      // assert
      expect(RunnerImp.debugLogMessages).to.include.something.that.equals("foo");
    });

    it("should return true", () => {
      // arrange
      RunnerImp.debugLogMessages = [];

      // act
      let actual = RunnerImp.testRunStdOutWrite(undefined);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("run", () => {
    let mockBegin;
    let mockEnd;
    let mockFramework;
    let mockPluginReporter;
    let mockProgress;
    let mockRunTests;

    beforeEach(() => {
      mockReporter.configure = Sinon.spy();

      mockFramework = <PluginTestFramework> {};
      mockFramework.initArgs = Sinon.spy();

      mockPluginReporter = <PluginReporter> {};
      mockPluginReporter.runArgs = Sinon.spy();

      let mockLoadElmTestApp = Sinon.stub();
      let mockWorker = Sinon.stub();
      mockBegin = Sinon.spy();
      mockEnd = Sinon.spy();
      mockProgress = Sinon.spy();
      mockRunTests = Sinon.spy();
      mockWorker.returns({
        ports: {
          begin: {subscribe: mockBegin},
          end: {subscribe: mockEnd},
          progress: {subscribe: mockProgress},
          runTests: {send: mockRunTests}
        }
      });
      mockLoadElmTestApp.returns({UnitTest: {worker: mockWorker}});
      runner.loadElmTestApp = mockLoadElmTestApp;
    });

    it("should return a promise to run the tests", () => {
      // arrange
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      let context = <ExecutionContext> {config};

      // act
      let actual = runner.run(context);

      // assert
      expect(actual.isResolved()).to.be.false;
    });

    it("should return a promise to is completed when the test run is complete", () => {
      // arrange
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      let context = <ExecutionContext> {config};
      let complete = undefined;
      let end = (x) => complete = x;
      let worker = Sinon.stub();
      worker.returns({
        ports: {
          begin: {subscribe: mockBegin},
          end: {subscribe: end},
          progress: {subscribe: mockProgress},
          runTests: {send: mockRunTests}
        }
      });
      (<SinonStub>runner.loadElmTestApp).returns({UnitTest: {worker: worker}});
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });

      // act
      let actual = runner.run(context);
      complete(<TestReportRoot>{});

      // assert
      expect(actual.isResolved()).to.be.true;
    });

    it("should load the elm test app", () => {
      // arrange
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      let context = <ExecutionContext> {config, buildOutputFilePath: "./foo", testFile: "bar"};

      // act
      runner.run(context);

      // assert
      expect(runner.loadElmTestApp).to.have.been.calledWith("./foo", Sinon.match.any);
    });

    it("should subscribe to begin", () => {
      // arrange
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      let context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should subscribe to end", () => {
      // arrange
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      let context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should subscribe to progress", () => {
      // arrange
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      let context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should call runTests with the supplied reportProgress value", () => {
      let config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework, reportProgress: true};
      let context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockRunTests).to.have.been.calledWith({reportProgress: true});
    });
  });
});
