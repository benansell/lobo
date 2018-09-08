"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Builder, BuilderImp, createBuilder} from "../../../lib/builder";
import {ExecutionContext, LoboConfig} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";
import {Util} from "../../../lib/util";

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
  let mockRunElmCommand: Sinon.SinonStub;
  let mockUtil: Util;

  beforeEach(() => {
    mockConfirm = Sinon.stub();
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.error = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockRunElmCommand = Sinon.stub();
    mockUtil = <Util> {};
    mockUtil.runElmCommand = mockRunElmCommand;
    let rewiredImp = RewiredBuilder.__get__("BuilderImp");
    builder = new rewiredImp(mockLogger, mockUtil);

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
      let config = <LoboConfig> {noCleanup: false};
      let context = <ExecutionContext> {config};
      let mockMake = Sinon.stub();
      builder.make = mockMake;
      mockMake.resolves();

      // act
      let actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(builder.make).to.have.been.calledWith(context, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied testSuiteOutputFilePath", () => {
      // arrange
      let config = <LoboConfig> {noCleanup: false};
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
      let config = <LoboConfig> {noCleanup: false};
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
    it("should call util.runElmCommand with the supplied context", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been.calledWith(config, Sinon.match.any);
      });
    });

    it("should call util.runElmCommand with the supplied loboDirectory", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc", loboDirectory: "foo"};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, "foo");
      });
    });

    it("should call util.runElmCommand with the action 'make'", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/^make /));
      });
    });

    it("should call util.runElmCommand with the supplied testSuiteOutputFilePath", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/ bar /));
      });
    });

    it("should call util.runElmCommand with the specified output file path", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc"};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/--output=baz/));
      });
    });

    it("should call util.runElmCommand without --optimize when config.optimize is false", () => {
      // arrange
      let config = <LoboConfig> {optimize: false};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match((x) => x.indexOf("--optimize") === -1));
      });
    });

    it("should call util.runElmCommand with --optimize when config.optimize is true and hasDebugUsage is false", () => {
      // arrange
      let config = <LoboConfig> {optimize: true};
      let context = <ExecutionContext> {config, hasDebugUsage: false};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/ --optimize/));
      });
    });

    it("should call util.runElmCommand without --optimize when config.optimize is true and hasDebugUsage is true", () => {
      // arrange
      let config = <LoboConfig> {optimize: true};
      let context = <ExecutionContext> {config, hasDebugUsage: true};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).not.to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/ --optimize/));
      });
    });

    it("should call util.runElmCommand without --optimize when config.optimize is false and hasDebugUsage is true", () => {
      // arrange
      let config = <LoboConfig> {optimize: true};
      let context = <ExecutionContext> {config, hasDebugUsage: true};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.finally(() => {
        expect(mockRunElmCommand).not.to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/ --optimize/));
      });
    });

    it("should call resolve when there are no elm-make build errors", () => {
      // arrange
      let config = <LoboConfig> {};
      let context = <ExecutionContext> {config};

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      return actual.then(() => {
        expect(mockRunElmCommand).to.have.been.called;
      });
    });

    it("should catch any elm-make build errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {};
      let context = <ExecutionContext> {config};
      mockRunElmCommand.throws( new Error("qux"));

      // act
      let actual = builder.make(context, "bar", "baz");

      // assert
      actual.catch((err) => {
        expect(err.toString()).to.equal("Error: Build Failed");
      });
    });
  });
});
