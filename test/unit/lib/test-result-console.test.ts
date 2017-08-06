"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {createTestResultDecoratorConsole, TestResultDecoratorConsoleImp} from "../../../lib/test-result-decorator-console";
import {TestResultDecorator} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib test-result-decorator-console", () => {
  let RewiredFormatter = rewire("../../../lib/test-result-decorator-console");
  let rewiredImp;
  let decorator: TestResultDecoratorConsoleImp;
  let mockRedStyle: SinonStub;
  let mockGreenStyle: SinonStub;
  let mockYellowStyle: SinonStub;
  
  beforeEach(() => {
    mockRedStyle = Sinon.stub();
    mockGreenStyle = Sinon.stub();
    mockYellowStyle = Sinon.stub();
    
    RewiredFormatter.__set__({
      Chalk: {
        green: mockGreenStyle,
        red: mockRedStyle,
        yellow: mockYellowStyle
      }
    });
    
    rewiredImp = RewiredFormatter.__get__("TestResultDecoratorConsoleImp");
    decorator = new rewiredImp();
  });

  describe("createTestResultDecoratorConsole", () => {
    it("should return reporter", () => {
      // act
      let actual: TestResultDecorator = createTestResultDecoratorConsole();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("ctor", () => {
    it("should set onlyStyle to red style when failOnOnly is true", () => {
      // arrange
      let revert = RewiredFormatter.__with__({program: {failOnOnly: true}});
      
      // act
      revert(() => new rewiredImp().only("foo"));
      
      // assert
      expect(mockRedStyle).to.have.been.calledWith("foo");
    });

    it("should set onlyStyle to yellow style when failOnOnly is false", () => {
      // arrange
      let revert = RewiredFormatter.__with__({program: {failOnOnly: false}});

      // act
      revert(() => new rewiredImp().only("foo"));

      // assert
      expect(mockYellowStyle).to.have.been.calledWith("foo");
    });

    it("should set skipStyle to red style when failOnSkip is true", () => {
      // arrange
      let revert = RewiredFormatter.__with__({program: {failOnSkip: true}});

      // act
      revert(() => new rewiredImp().skip("foo"));

      // assert
      expect(mockRedStyle).to.have.been.calledWith("foo");
    });

    it("should set skipStyle to yellow style when failOnSkip is false", () => {
      // arrange
      let revert = RewiredFormatter.__with__({program: {failOnSkip: false}});

      // act
      revert(() => new rewiredImp().skip("foo"));

      // assert
      expect(mockYellowStyle).to.have.been.calledWith("foo");
    });

    it("should set todoStyle to red style when failOnTodo is true", () => {
      // arrange
      let revert = RewiredFormatter.__with__({program: {failOnTodo: true}});

      // act
      revert(() => new rewiredImp().todo("foo"));

      // assert
      expect(mockRedStyle).to.have.been.calledWith("foo");
    });

    it("should set todoStyle to yellow style when failOnTodo is false", () => {
      // arrange
      let revert = RewiredFormatter.__with__({program: {failOnTodo: false}});

      // act
      revert(() => new rewiredImp().todo("foo"));

      // assert
      expect(mockYellowStyle).to.have.been.calledWith("foo");
    });
  });

  describe("bulletPoint", () => {
    it("should be •", () => {
      // assert
      expect(decorator.bulletPoint).to.equal("•");
    });
  });

  describe("verticalBarEnd", () => {
    it("should be └", () => {
      // assert
      expect(decorator.verticalBarEnd).to.equal("└");
    });
  });

  describe("verticalBarMiddle", () => {
    it("should be │", () => {
      // assert
      expect(decorator.verticalBarMiddle).to.equal("│");
    });
  });

  describe("verticalBarStart", () => {
    it("should be ┌", () => {
      // assert
      expect(decorator.verticalBarStart).to.equal("┌");
    });
  });
  
  describe("diff", () => {
    it("should return value styled with red", () => {
      // arrange
      mockRedStyle.callsFake(x => x + "bar");

      // act
      let actual  = decorator.diff("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("expect", () => {
    it("should return value styled with yellow", () => {
      // arrange
      mockYellowStyle.callsFake(x => x + "bar");

      // act
      let actual  = decorator.expect("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("failed", () => {
    it("should return value styled with red", () => {
      // arrange
      mockRedStyle.callsFake(x => x + "bar");

      // act
      let actual  = decorator.failed("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("line", () => {
    it("should return value without any changes", () => {
      // act
      let actual  = decorator.line("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("given", () => {
    it("should return value styled with yellow", () => {
      // arrange
      mockYellowStyle.callsFake(x => x + "bar");

      // act
      let actual  = decorator.given("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("inconclusive", () => {
    it("should return value styled with yellow", () => {
      // arrange
      mockYellowStyle.callsFake(x => x + "bar");

      // act
      let actual  = decorator.inconclusive("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("passed", () => {
    it("should return value styled with green", () => {
      // arrange
      mockGreenStyle.callsFake(x => x + "bar");

      // act
      let actual  = decorator.passed("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });
});
