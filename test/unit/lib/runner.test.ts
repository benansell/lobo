"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {SinonStub} from "sinon";
import {Logger} from "../../../lib/logger";
import {createRunner, ElmTestApp, LoboElmApp, NodeProcessStdout, Runner, RunnerImp} from "../../../lib/runner";
import {Reporter} from "../../../lib/reporter";
import {ExecutionContext, LoboConfig, PluginReporter, PluginTestFramework, ProgressReport, TestReportRoot} from "../../../lib/plugin";

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib runner", () => {
  const RewiredRunner = rewire("../../../lib/runner");
  let runner: RunnerImp;
  let mockLogger: Logger;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;
  let mockReporter: Reporter;
  let mockRunNextTest: () => void;
  let mockStdout: NodeProcessStdout;
  let revertRunner;

  beforeEach(() => {
    revertRunner = RewiredRunner.__set__({process: {stdout: { write: Sinon.spy()}} });
    const rewiredImp = RewiredRunner.__get__("RunnerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockStdout = <NodeProcessStdout> {};
    mockStdout.write = Sinon.spy();
    mockReporter = <Reporter> {};
    mockRunNextTest = Sinon.stub();
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
      const actual: Runner = createRunner();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("loadElmTestApp", () => {
    it("should the loaded elm test app", () => {
      // act
      const actual = runner.loadElmTestApp("./runner", mockLogger);

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
      const actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockReporter.init).to.have.been.calledWith(123);
    });

    it("should return a function that calls supplied reject when an error is thrown", () => {
      // arrange
      const expected = new Error("foo");
      mockReporter.init = () => {
        throw expected;
      };

      // act
      const actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });

    it("should return a function that set stdout.write to originalNodeProcessWrite when an error is thrown", () => {
      // arrange
      const expected = new Error("foo");
      mockReporter.init = () => {
        throw expected;
      };
      const mockWrite = Sinon.spy();
      mockStdout.write = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = mockWrite;

      // act
      const actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockStdout.write).to.equal(mockWrite);
    });

    it("should set the originalNodeProcessWrite to value of stdout.write", () => {
      // arrange
      mockReporter.init = Sinon.spy();
      const mockWrite = Sinon.spy();
      mockStdout.write = mockWrite;

      // act
      const actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(RunnerImp.originalNodeProcessWrite).to.equal(mockWrite);
    });

    it("should set stdout.write to RunnerImp.testRunStdOutWrite", () => {
      // arrange
      mockReporter.init = Sinon.spy();
      mockStdout.write = Sinon.spy();

      // act
      const actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockStdout.write).to.equal(RunnerImp.testRunStdOutWrite);
    });

    it("should initialize the debugLogMessage list to an empty array", () => {
      // arrange
      mockReporter.init = Sinon.spy();
      RunnerImp.debugLogMessages = ["foo"];

      // act
      const actual = RunnerImp.makeTestRunBegin(mockStdout, mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(RunnerImp.debugLogMessages).to.be.empty;
    });
  });

  describe("makeTestRunProgress", () => {
    it("should return a function that calls reporter.update with the supplied progress report", () => {
      // arrange
      mockReporter.update = Sinon.spy();
      const expected = <ProgressReport> {reason: "foobar"};

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.update).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should return a function that calls reporter.update with the accumulated Debug.log messages", () => {
      // arrange
      mockReporter.update = Sinon.spy();
      const progressReport = <ProgressReport> {reason: "foobar"};
      const expected = ["baz"];
      RunnerImp.debugLogMessages = expected;

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(progressReport);

      // assert
      expect(mockReporter.update).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return a function that calls supplied reject when an error is thrown", () => {
      // arrange
      const expected = new Error("foo");
      mockReporter.update = () => {
        throw expected;
      };

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });

    it("should return a function that set stdout.write to originalNodeProcessWrite when an error is thrown", () => {
      // arrange
      const expected = new Error("foo");
      mockReporter.update = () => {
        throw expected;
      };
      const mockWrite = Sinon.spy();
      mockStdout.write = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = mockWrite;

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockStdout.write).to.equal(mockWrite);
    });

    it("should return a function that restore stdout.write to the original value before calling reporter.update", () => {
      // arrange
      const original = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = original;

      mockReporter.update = Sinon.stub();
      (<SinonStub>mockReporter.update).callsFake(() => {
        expect(mockStdout.write).to.equal(original);
      });

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(<ProgressReport> {});

      // assert -- see arrange
    });

    it("should return a function that leaves stdout.write set to testRunStdOutWrite after it has been called", () => {
      // arrange
      RunnerImp.originalNodeProcessWrite = Sinon.spy();
      mockReporter.update = Sinon.stub();

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockStdout.write).to.equal(RunnerImp.testRunStdOutWrite);
    });

    it("should return a function that clears the debugLogMessages after it has been called", () => {
      // arrange
      RunnerImp.debugLogMessages = ["foo"];
      mockReporter.update = Sinon.stub();

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(RunnerImp.debugLogMessages).to.be.empty;
    });

    it("should return a function that calls runNextTest when no errors have been thrown", () => {
      // arrange
      mockReporter.update = Sinon.spy();
      const progressReport = <ProgressReport> {reason: "foobar"};

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(progressReport);

      // assert
      expect(mockRunNextTest).to.have.been.called;
    });

    it("should return a function that does not call runNextTest when an error occurs", () => {
      // arrange
      mockReporter.update = Sinon.stub().throws();
      const progressReport = <ProgressReport> {reason: "foobar"};

      // act
      const actual = RunnerImp.makeTestRunProgress(mockStdout, mockLogger, mockReporter, mockRunNextTest, mockReject);
      actual(progressReport);

      // assert
      expect(mockRunNextTest).not.to.have.been.called;
    });
  });

  describe("makeTestRunComplete", () => {
    it("should return a function that calls reporter.finish with the supplied results", () => {
      // arrange
      const context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });
      const expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      const actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.finish).to.have.been.calledWith(expected);
    });

    it("should return a function that calls resolve when reporter.finish is true", () => {
      // arrange
      const context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });
      const expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      const actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should return a function that calls reject when reporter.finish throws error", () => {
      // arrange
      const context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: () => {
          return {"catch": func => func()};
        }
      });
      const expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      const actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReject).to.have.been.calledWith();
    });

    it("should return a function that set stdout.write to originalNodeProcessWrite when an error is thrown", () => {
      // arrange
      const context = <ExecutionContext> {config: {}};
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: () => {
          return {"catch": func => func()};
        }
      });
      const expected = <TestReportRoot> {runType: "NORMAL"};
      const mockWrite = Sinon.spy();
      mockStdout.write = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = mockWrite;

      // act
      const actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockStdout.write).to.equal(mockWrite);
    });

    it("should return a function that resets the stdout.write to the originalNodeProcessWrite value", () => {
      // arrange
      const context = <ExecutionContext> {config: {}};
      const original = Sinon.spy();
      RunnerImp.originalNodeProcessWrite = original;
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });

      // act
      const actual = RunnerImp.makeTestRunComplete(mockStdout, mockLogger, context, mockReporter, mockResolve, mockReject);
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
      const actual = RunnerImp.testRunStdOutWrite(undefined);

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
    let mockStartTestRun;

    beforeEach(() => {
      mockReporter.configure = Sinon.spy();

      mockFramework = <PluginTestFramework> {};
      mockFramework.initArgs = Sinon.spy();

      mockPluginReporter = <PluginReporter> {};
      mockPluginReporter.runArgs = Sinon.spy();

      const mockLoadElmTestApp = Sinon.stub();
      const mockInit = Sinon.stub();
      mockBegin = Sinon.spy();
      mockEnd = Sinon.spy();
      mockProgress = Sinon.spy();
      mockRunNextTest = Sinon.spy();
      mockStartTestRun = Sinon.spy();
      mockInit.returns(<LoboElmApp> {
        ports: {
          begin: {subscribe: mockBegin},
          end: {subscribe: mockEnd},
          progress: {subscribe: mockProgress},
          runNextTest: {send: mockRunNextTest},
          startTestRun: {send: mockStartTestRun}
        }
      });
      mockLoadElmTestApp.returns(<ElmTestApp> {Elm: {UnitTest: {init: mockInit}}});
      runner.loadElmTestApp = mockLoadElmTestApp;
    });

    it("should return a promise to run the tests", () => {
      // arrange
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      const context = <ExecutionContext> {config};

      // act
      const actual = runner.run(context);

      // assert
      expect(actual.isResolved()).to.be.false;
    });

    it("should return a promise that is completed when the test run is complete", () => {
      // arrange
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      const context = <ExecutionContext> {config};
      let complete = undefined;
      const end = (x) => complete = x;
      const init = Sinon.stub();
      init.returns(<LoboElmApp> {
        ports: {
          begin: {subscribe: mockBegin},
          end: {subscribe: end},
          progress: {subscribe: mockProgress},
          runNextTest: {send: mockRunNextTest},
          startTestRun: {send: mockStartTestRun}
        }
      });
      (<SinonStub>runner.loadElmTestApp).returns(<ElmTestApp> {Elm: {UnitTest: {init: init}}});
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });

      // act
      const actual = runner.run(context);
      complete(<TestReportRoot>{});

      // assert
      expect(actual.isResolved()).to.be.true;
    });

    it("should load the elm test app", () => {
      // arrange
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      const context = <ExecutionContext> {config, buildOutputFilePath: "./foo", testDirectory: "bar"};

      // act
      runner.run(context);

      // assert
      expect(runner.loadElmTestApp).to.have.been.calledWith("./foo", Sinon.match.any);
    });

    it("should subscribe to begin", () => {
      // arrange
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      const context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should subscribe to end", () => {
      // arrange
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      const context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should subscribe to progress", () => {
      // arrange
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework};
      const context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should call startTestRun with the supplied reportProgress value", () => {
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework, reportProgress: true};
      const context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockStartTestRun).to.have.been.calledWith({reportProgress: true});
    });

    it("should not call runNextTest in same tick", () => {
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework, reportProgress: true};
      const context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      expect(mockRunNextTest).not.to.have.been.called;
    });

    it("should schedule immediately a call to runNextTest with true", () => {
      const config = <LoboConfig> {reporter: mockPluginReporter, testFramework: mockFramework, reportProgress: true};
      const context = <ExecutionContext> {config};

      // act
      runner.run(context);

      // assert
      setImmediate(() => {
        expect(mockRunNextTest).to.have.been.calledWith(true);
      });
    });
  });
});
