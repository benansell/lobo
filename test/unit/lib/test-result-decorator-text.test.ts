"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import { createTestResultDecoratorText,   TestResultDecoratorTextImp } from "../../../lib/test-result-decorator-text";
import {TestResultDecorator} from "../../../lib/plugin";

const expect = chai.expect;
chai.use(SinonChai);

describe("lib test-result-decorator-text", () => {
  const RewiredDecorator = rewire("../../../lib/test-result-decorator-text");
  let rewiredImp;
  let decorator: TestResultDecoratorTextImp;

  beforeEach(() => {
    rewiredImp = RewiredDecorator.__get__("TestResultDecoratorTextImp");
    decorator = new rewiredImp();
  });

  describe("createTestResultDecoratorText", () => {
    it("should return reporter", () => {
      // act
      const actual: TestResultDecorator = createTestResultDecoratorText();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("ctor", () => {
    it("should set onlyStyle to failed style when failOnOnly is true", () => {
      // arrange
      const revert = RewiredDecorator.__with__({program: {failOnOnly: true}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().only);

      // assert

      expect(actual).to.equal(decorator.failed);
    });

    it("should set onlyStyle to inconclusive style when failOnOnly is false", () => {
      // arrange
      const revert = RewiredDecorator.__with__({program: {failOnOnly: false}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().only);

      // assert
      expect(actual).to.equal(decorator.inconclusive);
    });

    it("should set skipStyle to failed style when failOnSkip is true", () => {
      // arrange
      const revert = RewiredDecorator.__with__({program: {failOnSkip: true}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().skip);

      // assert
      expect(actual).to.equal(decorator.failed);
    });

    it("should set skipStyle to inconclusive style when failOnSkip is false", () => {
      // arrange
      const revert = RewiredDecorator.__with__({program: {failOnSkip: false}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().skip);

      // assert
      expect(actual).to.equal(decorator.inconclusive);
    });

    it("should set todoStyle to failed style when failOnTodo is true", () => {
      // arrange
      const revert = RewiredDecorator.__with__({program: {failOnTodo: true}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().todo);

      // assert
      expect(actual).to.equal(decorator.failed);
    });

    it("should set todoStyle to inconclusive style when failOnTodo is false", () => {
      // arrange
      const revert = RewiredDecorator.__with__({program: {failOnTodo: false}});

      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().todo);

      // assert
      expect(actual).to.equal(decorator.inconclusive);
    });
  });

  describe("bulletPoint", () => {
    it("should be •", () => {
      // act
      const actual = decorator.bulletPoint();

      // assert
      expect(actual).to.equal("•");
    });
  });

  describe("rightArrow", () => {
    it("should be →", () => {
      // act
      const actual = decorator.rightArrow();

      // assert
      expect(actual).to.equal("→");
    });
  });

  describe("verticalBarEnd", () => {
    it("should be └", () => {
      // act
      const actual = decorator.verticalBarEnd();

      // assert
      expect(actual).to.equal("└");
    });
  });

  describe("verticalBarMiddle", () => {
    it("should be │", () => {
      // act
      const actual = decorator.verticalBarMiddle();

      // assert
      expect(actual).to.equal("│");
    });
  });

  describe("verticalBarStart", () => {
    it("should be ┌", () => {
      // act
      const actual = decorator.verticalBarStart();

      // assert
      expect(actual).to.equal("┌");
    });
  });

  describe("debugLog", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.debugLog("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("diff", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.diff("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("expect", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.expect("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("failed", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.failed("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("line", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.line("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("given", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.given("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("inconclusive", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.inconclusive("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("passed", () => {
    it("should return value unaltered", () => {
      // act
      const actual = decorator.passed("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });
});
