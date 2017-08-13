"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

let expect = chai.expect;
chai.use(SinonChai);

describe("bin lobo", () => {

  describe("run", () => {
    let rewiredLobo;
    let mockCreateLobo;
    let mockLobo;
    let revert: () => void;
    let run: () => void;

    beforeEach(() => {
      (<{__loboUnitTest__: boolean}><{}>global).__loboUnitTest__ = true;
      rewiredLobo = rewire("../../../bin/lobo");
      mockLobo = { execute: Sinon.stub(), handleUncaughtException: Sinon.stub() };
      mockCreateLobo = Sinon.stub();
      mockCreateLobo.returns(mockLobo);
      revert = rewiredLobo.__set__( {main: { createLobo: mockCreateLobo } });
      run = rewiredLobo.__get__('run');
    });

    afterEach(() => {
      revert();
    });

    it("should set process title as 'lobo'", () => {
      // arrange
      process.title = "foo";

      // act
      run();

      // assert
      expect(process.title).to.equal("lobo");
    });

    it("should setup lobo to handle uncaught exceptions'", () => {
      // arrange
      let expected = new Error("foo");
      let fakeOn = (eventName, func) => {
        if(eventName === "uncaughtException") {
          func(expected);
        }
      };

      let revert = rewiredLobo.__with__({process: { on: fakeOn}});

      // act
      revert(() => run());


      // assert
      expect(mockLobo.handleUncaughtException).to.have.been.calledWith(expected);
    });
  });
});
