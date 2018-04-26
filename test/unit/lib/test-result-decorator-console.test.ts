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
  let RewiredDecorator = rewire("../../../lib/test-result-decorator-console");
  let rewiredImp;
  let decorator: TestResultDecoratorConsoleImp;
  let mockCyanStyle: SinonStub;
  let mockRedStyle: SinonStub;
  let mockGreenStyle: SinonStub;
  let mockYellowStyle: SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockCyanStyle = Sinon.stub();
    mockRedStyle = Sinon.stub();
    mockGreenStyle = Sinon.stub();
    mockYellowStyle = Sinon.stub();

    revert = RewiredDecorator.__set__({
      chalk_1: {
        "default": {
          cyan: mockCyanStyle,
          green: mockGreenStyle,
          red: mockRedStyle,
          yellow: mockYellowStyle
        }
      }
    });

    rewiredImp = RewiredDecorator.__get__("TestResultDecoratorConsoleImp");
    decorator = new rewiredImp();
  });

  afterEach(() => {
    revert();
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
    it("should set onlyStyle to failed style when failOnOnly is true", () => {
      // arrange
      let revert = RewiredDecorator.__with__({program: {failOnOnly: true}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().only);

      // assert

      expect(actual).to.equal(decorator.failed);
    });

    it("should set onlyStyle to inconclusive style when failOnOnly is false", () => {
      // arrange
      let revert = RewiredDecorator.__with__({program: {failOnOnly: false}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().only);

      // assert
      expect(actual).to.equal(decorator.inconclusive);
    });

    it("should set skipStyle to failed style when failOnSkip is true", () => {
      // arrange
      let revert = RewiredDecorator.__with__({program: {failOnSkip: true}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().skip);

      // assert
      expect(actual).to.equal(decorator.failed);
    });

    it("should set skipStyle to inconclusive style when failOnSkip is false", () => {
      // arrange
      let revert = RewiredDecorator.__with__({program: {failOnSkip: false}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().skip);

      // assert
      expect(actual).to.equal(decorator.inconclusive);
    });

    it("should set todoStyle to failed style when failOnTodo is true", () => {
      // arrange
      let revert = RewiredDecorator.__with__({program: {failOnTodo: true}});

      // act
      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().todo);

      // assert
      expect(actual).to.equal(decorator.failed);
    });

    it("should set todoStyle to inconclusive style when failOnTodo is false", () => {
      // arrange
      let revert = RewiredDecorator.__with__({program: {failOnTodo: false}});

      let actual: Function = undefined;
      revert(() => actual = new rewiredImp().todo);

      // assert
      expect(actual).to.equal(decorator.inconclusive);
    });
  });

  describe("bulletPoint", () => {
    it("should be •", () => {
      // act
      let actual = decorator.bulletPoint();

      // assert
      expect(actual).to.equal("•");
    });
  });

  describe("rightArrow", () => {
    it("should be →", () => {
      // act
      let actual = decorator.rightArrow();

      // assert
      expect(actual).to.equal("→");
    });
  });

  describe("verticalBarEnd", () => {
    it("should be └", () => {
      // act
      let actual = decorator.verticalBarEnd();

      // assert
      expect(actual).to.equal("└");
    });
  });

  describe("verticalBarMiddle", () => {
    it("should be │", () => {
      // act
      let actual = decorator.verticalBarMiddle();

      // assert
      expect(actual).to.equal("│");
    });
  });

  describe("verticalBarStart", () => {
    it("should be ┌", () => {
      // act
      let actual = decorator.verticalBarStart();

      // assert
      expect(actual).to.equal("┌");
    });
  });

  describe("debugLog", () => {
    it("should return value styled with cyan", () => {
      // arrange
      mockCyanStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.debugLog("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("diff", () => {
    it("should return value styled with red", () => {
      // arrange
      mockRedStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.diff("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("expect", () => {
    it("should return value styled with yellow", () => {
      // arrange
      mockYellowStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.expect("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("failed", () => {
    it("should return value styled with red", () => {
      // arrange
      mockRedStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.failed("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("line", () => {
    it("should return value without any changes", () => {
      // act
      let actual = decorator.line("foo");

      // assert
      expect(actual).to.equal("foo");
    });
  });

  describe("given", () => {
    it("should return value styled with yellow", () => {
      // arrange
      mockYellowStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.given("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("inconclusive", () => {
    it("should return value styled with yellow", () => {
      // arrange
      mockYellowStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.inconclusive("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });

  describe("passed", () => {
    it("should return value styled with green", () => {
      // arrange
      mockGreenStyle.callsFake(x => x + "bar");

      // act
      let actual = decorator.passed("foo");

      // assert
      expect(actual).to.equal("foobar");
    });
  });
});
