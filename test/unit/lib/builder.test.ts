"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Builder, BuilderImp, createBuilder} from "../../../lib/builder";
import {ExecutionContext, LoboConfig} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib builder", () => {
  let RewiredBuilder = rewire("../../../lib/builder");
  let builder: BuilderImp;
  let mockConfirm: Sinon.SinonStub;
  let mockLogger: Logger;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;

  beforeEach(() => {
    mockConfirm = Sinon.stub();
    let rewiredImp = RewiredBuilder.__get__("BuilderImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.error = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    builder = new rewiredImp(mockLogger);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
  });

  describe("createBuilder", () => {
    it("should return builder", () => {
      // act
      let actual: Builder = createBuilder();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("build", () => {
    it("should call make with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied testSuiteOutputFilePath", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, buildOutputFilePath: "foo", testSuiteOutputFilePath: "bar"};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
      });
    });

    it("should call make with the supplied buildOutputFilePath", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, buildOutputFilePath: "foo", testSuiteOutputFilePath: "bar"};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo");
      });
    });
  });

  describe("make", () => {
    let revertMocks: () => void;
    let mockExec: Sinon.SinonStub;
    let mockPathResolve: Sinon.SinonStub;
    let mockJoin: Sinon.SinonStub;

    beforeEach(() => {
      mockExec = Sinon.stub();
      mockPathResolve = Sinon.stub();
      mockJoin = Sinon.stub();
      revertMocks = RewiredBuilder.__set__({childProcess: {execSync: mockExec}, console: {log: Sinon.stub()},
        path: { resolve: mockPathResolve, join: mockJoin}});
    });

    afterEach(() => {
      revertMocks();
    });

    it("should call elm-make to build the tests", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};
      mockPathResolve.callsFake(() => "def");
      mockJoin.callsFake((...args) => args.join("/"));

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/^abc([\/\\])elm-make /), Sinon.match.any);
      });
    });

    it("should call elm-make with the supplied testSuiteOutputFilePath", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};
      mockPathResolve.callsFake(() => "def");
      mockJoin.callsFake((...args) => args.join("-"));

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/elm-make.* bar/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests to the specified output file path", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/--output=baz/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests without --yes when prompt is true", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--yes") === -1), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests with --yes when prompt is false", () => {
      // arrange
      let config = <LoboConfig> {prompt: false};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/ --yes/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests without --warn when noWarn is true", () => {
      // arrange
      let config = <LoboConfig> {noWarn: true};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--warn") === -1), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests with --warn when noWarn is false", () => {
      // arrange
      let config = <LoboConfig> {noWarn: false};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/ --warn/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests with cwd as lobo directory", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo", noWarn: false};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match.any, Sinon.match(x => x.cwd === "foo"));
      });
    });

    it("should call resolve when there are no elm-make build errors", () => {
      // arrange
      let config = <LoboConfig> {};

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      return actual.then(() => {
        expect(mockExec).to.have.been.called;
      });
    });

    it("should catch any elm-make build errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {};
      let expected = new Error();
      mockExec.throws(expected);

      // act
      let actual = builder.make(config, "bar", "baz");

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });
});
