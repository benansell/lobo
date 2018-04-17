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
      let context = <ExecutionContext> {config, testFile: "foo"};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied buildOutputFilePath", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testFile: "foo"};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(config, Sinon.match.any);
      });
    });

    it("should call make with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, buildOutputFilePath: "foo", testDirectory: "bar", testFile: "baz"};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied test file", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, buildOutputFilePath: "foo", testDirectory: "bar", testFile: "baz"};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz");
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
      let config = <LoboConfig> {compiler: "abc", testFramework: {config: {name: "foo"}}, testMainElm: "bar"};
      mockPathResolve.callsFake(() => "def");
      mockJoin.callsFake((...args) => args.join("/"));

      // act
      let actual = builder.make(config, "bar", "baz", "qux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/^abc([\/\\])elm-make /), Sinon.match.any);
      });
    });

    it("should call elm-make with the qualified path to testMainElm file from the config", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc", testFramework: {config: {name: "foo"}}, testMainElm: "bar"};
      mockPathResolve.callsFake(() => "def");
      mockJoin.callsFake((...args) => args.join("-"));

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/elm-make.* def-foo-bar/), Sinon.match.any);
      });
    });

    it("should call elm-make with the relative path to testFile", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc", testFramework: {config: {name: "foo"}}, testMainElm: "bar"};
      mockPathResolve.callsFake(() => "def");
      mockJoin.callsFake((...args) => args.join("-"));

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/elm-make quux/), Sinon.match.any);
      });
    });

    it("should not call elm-make with the relative path to testFile when it is 'Tests.elm'", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc", testFramework: {config: {name: "foo"}}, testMainElm: "bar"};
      mockPathResolve.callsFake(() => "def");
      mockJoin.callsFake((...args) => args.join("-"));

      // act
      let actual = builder.make(config, "baz", "Tests.elm", "qux");

      // assert
      return actual.finally(() => {
        expect(mockExec).not.to.have.been.calledWith(Sinon.match(/Tests.elm/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests to the specified output file path", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar"};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/--output=baz/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests without --yes when prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", prompt: true};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--yes") === -1), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests with --yes when prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", prompt: false};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/ --yes/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests without --warn when noWarn is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", noWarn: true};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--warn") === -1), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests with --warn when noWarn is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", noWarn: false};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match(/ --warn/), Sinon.match.any);
      });
    });

    it("should call elm-make to build the tests with cwd as supplied directory", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", noWarn: false};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.finally(() => {
        expect(mockExec).to.have.been.calledWith(Sinon.match.any, Sinon.match(x => x.cwd === "qux"));
      });
    });

    it("should call resolve when there are no elm-make build errors", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar"};

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      return actual.then(() => {
        expect(mockExec).to.have.been.called;
      });
    });

    it("should catch any elm-make build errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar"};
      let expected = new Error();
      mockExec.throws(expected);

      // act
      let actual = builder.make(config, "baz", "qux", "quux");

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });
});
