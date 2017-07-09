"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import rewire = require("rewire");
import * as sinonChai from "sinon-chai";

import {Logger} from "../../../lib/logger";
import {createRunner, Runner, RunnerImp} from "../../../lib/runner";
import {Reporter} from "../../../lib/reporter";
import {LoboConfig, PluginReporter, PluginTestFramework, ProgressReport, TestReportRoot} from "../../../lib/plugin";
import {underline} from "chalk";

let expect = chai.expect;
chai.use(sinonChai);

describe("lib runner", function() {
  let RewiredRunner = rewire("../../../lib/runner");
  let runner: RunnerImp;
  let mockLogger: Logger;
  let mockReject: any;
  let mockResolve: any;
  let mockReporter: Reporter;

  beforeEach(() => {
    let rewiredImp = RewiredRunner.__get__("RunnerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = <any> sinon.spy();
    mockLogger.info = <any> sinon.spy();
    mockLogger.trace = <any> sinon.spy();
    mockReporter = <Reporter> {};
    runner = new rewiredImp(mockLogger, mockReporter);

    mockReject = <any> sinon.spy();
    mockResolve = <any> sinon.spy();
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
      let actual = runner.loadElmTestApp('./runner');

      // assert
      expect(actual).to.exist;
    });

    it("should throw an error when the elm test app is not found", () => {
      expect(() => runner.loadElmTestApp('./foo')).to.throw("Elm program not found");
    });
  });

  describe("makeTestRunBegin", () => {
    it("should return a function that calls reporter.init with the supplied testCount", () => {
      // arrange
      mockReporter.init = sinon.spy();

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
        throw expected
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
      mockReporter.update = sinon.spy();
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
        throw expected
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
      mockReporter.finish = sinon.spy();
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReporter.finish).to.have.been.calledWith(expected);
    });

    it("should return a function that calls resolve when reporter.finish is true", () => {
      // arrange
      mockReporter.finish = () => true;
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should return a function that calls reject when reporter.finish is false", () => {
      // arrange
      mockReporter.finish = () => false;
      let expected = <TestReportRoot> {runType: "NORMAL"};

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(expected);

      // assert
      expect(mockReject).to.have.been.calledWith();
    });

    it("should return a function that calls supplied reject when an error is thrown", () => {
      // arrange
      let expected = new Error("foo");
      mockReporter.finish = () => {
        throw expected
      };

      // act
      let actual = RunnerImp.makeTestRunComplete(mockLogger, mockReporter, mockResolve, mockReject);
      actual(<TestReportRoot> {});

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
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
      mockReporter.configure = sinon.spy();

      mockFramework = <PluginTestFramework> {};
      mockFramework.initArgs = sinon.spy();

      mockPluginReporter = <PluginReporter> {};
      mockPluginReporter.runArgs = sinon.spy();

      let mockLoadElmTestApp = sinon.stub();
      let mockWorker = sinon.stub();
      mockBegin = sinon.spy();
      mockEnd = sinon.spy();
      mockProgress = sinon.spy();
      mockRunTests = sinon.spy();
      mockWorker.returns({ports: {begin: {subscribe: mockBegin}, end: {subscribe: mockEnd}, progress: {subscribe: mockProgress}, runTests: {send: mockRunTests}}});
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
      let worker = sinon.stub();
      worker.returns({ports: {begin: {subscribe: mockBegin}, end: {subscribe: end}, progress: {subscribe: mockProgress}, runTests: {send: mockRunTests}}});
      (<sinon.SinonStub>runner.loadElmTestApp).returns({UnitTest: {worker: worker}});
      mockReporter.finish = sinon.stub();
      (<sinon.SinonStub>mockReporter.finish).returns(true);

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
