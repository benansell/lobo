"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Builder, BuilderImp, createBuilder} from "../../../lib/builder";
import {ExecutionContext, LoboConfig} from "../../../lib/plugin";
import {ElmCommandRunner} from "../../../lib/elm-command-runner";

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib builder", () => {
  let RewiredBuilder = rewire("../../../lib/builder");
  let builder: BuilderImp;
  let mockConfirm: Sinon.SinonStub;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;
  let mockMake: Sinon.SinonStub;
  let mockElmCommandRunner: ElmCommandRunner;

  beforeEach(() => {
    mockConfirm = Sinon.stub();
    mockMake = Sinon.stub();
    mockElmCommandRunner = <ElmCommandRunner> {};
    mockElmCommandRunner.make = mockMake;
    const rewiredImp = RewiredBuilder.__get__("BuilderImp");
    builder = new rewiredImp(mockElmCommandRunner);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
  });

  describe("createBuilder", () => {
    it("should return builder", () => {
      // act
      const actual: Builder = createBuilder();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("build", () => {
    it("should call make with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config};
      mockMake.callsFake((conf, prompt, hasDebugUsage, testSuiteOutputFilePath, buildOutputFilePath,
                          resolve) => resolve());

      // act
      const actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(mockMake).to.have.been
          .calledWith(context.config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied context.config.prompt value", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false, prompt: true};
      const context = <ExecutionContext> {config};
      mockMake.callsFake((conf, prompt, hasDebugUsage, testSuiteOutputFilePath, buildOutputFilePath,
                          resolve) => resolve());

      // act
      const actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(mockMake).to.have.been
          .calledWith(Sinon.match.any, true, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied context.hasDebugUsage value", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config, hasDebugUsage: true};
      mockMake.callsFake((conf, prompt, hasDebugUsage, testSuiteOutputFilePath, buildOutputFilePath,
                          resolve) => resolve());

      // act
      const actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(mockMake).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, true, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call make with the supplied testSuiteOutputFilePath", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config, buildOutputFilePath: "foo", testSuiteOutputFilePath: "bar"};
      mockMake.callsFake((conf, prompt, hasDebugUsage, testSuiteOutputFilePath, buildOutputFilePath,
                          resolve) => resolve());

      // act
      const actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(mockMake).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "bar", Sinon.match.any);
      });
    });

    it("should call make with the supplied buildOutputFilePath", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config, buildOutputFilePath: "foo", testSuiteOutputFilePath: "bar"};
      mockMake.callsFake((conf, prompt, hasDebugUsage, testSuiteOutputFilePath, buildOutputFilePath,
                          resolve) => resolve());

      // act
      const actual = builder.build(context);

      // assert
      return actual.then(() => {
        expect(mockMake).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, "foo");
      });
    });

    it("should call make with resolve function than returns the supplied context value", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config, hasDebugUsage: true};
      mockMake.callsFake((conf, prompt, hasDebugUsage, testSuiteOutputFilePath, buildOutputFilePath,
                          resolve) => resolve());

      // act
      const actual = builder.build(context);

      // assert
      return actual.then((value) => {
        expect(value).to.equal(context);
      });
    });
  });
});
