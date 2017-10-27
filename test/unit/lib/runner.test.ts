"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {SinonStub} from "sinon";
import {Logger} from "../../../lib/logger";
import {createRunner, Runner, RunnerImp} from "../../../lib/runner";
import {Reporter} from "../../../lib/reporter";
import {LoboConfig, PluginReporter, PluginTestFramework, ProgressReport, TestReportRoot} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib runner", () => {
  let RewiredRunner = rewire("../../../lib/runner");
  let runner: RunnerImp;
  let mockLogger: Logger;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;
  let mockReporter: Reporter;

  beforeEach(() => {
    let rewiredImp = RewiredRunner.__get__("RunnerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockReporter = <Reporter> {};
    runner = new rewiredImp(mockLogger, mockReporter);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
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
      let actual = runner.loadElmTestApp("./runner");

      // assert
      expect(actual).to.exist;
    });

    it("should throw an error when the elm test app is not found", () => {
      expect(() => runner.loadElmTestApp("./foo")).to.throw("Elm program not found");
    });
  });

  describe("makeTestRunBegin", () => {
    it("should return a function that calls reporter.init with the supplied testCount", () => {
      // arrange
      mockReporter.init = Sinon.spy();

      // act
      let actual = RunnerImp.makeTestRunBegin(mockLogger, mockReporter, mockReject);
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
      let actual = RunnerImp.makeTestRunBegin(mockLogger, mockReporter, mockReject);
      actual(123);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });
  });

  describe("makeTestRunProgress", () => {
    it("should return a function that calls reporter.update with the supplied progress report", () => {
      // arrange
      mockReporter.update = Sinon.spy();
      let expected = <ProgressReport> {reason: "foobar"};

      // act
      let actual = RunnerImp.makeTestRunProgress(mockLogger, mockReporter, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.update).to.have.been.calledWith(expected);
    });

    it("should return a function that calls supplied reject when an error is thrown", () => {
      // arrange
      let expected = new Error("foo");
      mockReporter.update = () => {
        throw expected;
      };

      // act
      let actual = RunnerImp.makeTestRunProgress(mockLogger, mockReporter, mockReject);
      actual(<ProgressReport> {});

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });
  });

  describe("makeTestRunComplete", () => {
    it("should return a function that calls reporter.finish with the supplied results", () => {
      // arrange
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.finish).to.have.been.calledWith(expected);
    });

    it("should return a function that calls resolve when reporter.finish is true", () => {
      // arrange
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: func => {
          func();
          return {"catch": Sinon.stub()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should return a function that calls reject when reporter.finish throws error", () => {
      // arrange
      mockReporter.finish = Sinon.stub();
      (<SinonStub>mockReporter.finish).returns({
        then: () => {
          return {"catch": func => func()};
        }
      });
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReject).to.have.been.calledWith();
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
      // act
      let actual = runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework});

      // assert
      expect(actual.isResolved()).to.be.false;
    });

    it("should return a promise to is completed when the test run is complete", () => {
      // arrange
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
      let actual = runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework});
      complete(<TestReportRoot>{});

      // assert
      expect(actual.isResolved()).to.be.true;
    });

    it("should load the elm test app", () => {
      // act
      runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework});

      // assert
      expect(runner.loadElmTestApp).to.have.been.calledWith("./foo");
    });

    it("should subscribe to begin", () => {
      // act
      runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework});

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should subscribe to end", () => {
      // act
      runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework});

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should subscribe to progress", () => {
      // act
      runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework});

      // assert
      expect(mockBegin).to.have.been.called;
    });

    it("should call runTests with the supplied reportProgress value", () => {
      // act
      runner.run(<LoboConfig> {reporter: mockPluginReporter, testFile: "./foo", testFramework: mockFramework, reportProgress: true});

      // assert
      expect(mockRunTests).to.have.been.calledWith({reportProgress: true});
    });
  });
});
