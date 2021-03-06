"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import { createTestResultDecoratorHtml,   TestResultDecoratorHtmlImp } from "../../../lib/test-result-decorator-html";
import {TestResultDecorator} from "../../../lib/plugin";

const expect = chai.expect;
chai.use(SinonChai);

describe("lib test-result-decorator-html", () => {
  const RewiredDecorator = rewire("../../../lib/test-result-decorator-html");
  let rewiredImp;
  let decorator: TestResultDecoratorHtmlImp;

  beforeEach(() => {
    rewiredImp = RewiredDecorator.__get__("TestResultDecoratorHtmlImp");
    decorator = new rewiredImp();
  });

  describe("createTestResultDecoratorHtml", () => {
    it("should return reporter", () => {
      // act
      const actual: TestResultDecorator = createTestResultDecoratorHtml();

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
    it("should be &bullet;", () => {
      // act
      const actual = decorator.bulletPoint();

      // assert
      expect(actual).to.equal("&bullet;");
    });
  });

  describe("rightArrow", () => {
    it("should be &rarr;", () => {
      // act
      const actual = decorator.rightArrow();

      // assert
      expect(actual).to.equal("&rarr;");
    });
  });

  describe("verticalBarEnd", () => {
    it("should be &boxur;", () => {
      // act
      const actual = decorator.verticalBarEnd();

      // assert
      expect(actual).to.equal("&boxur;");
    });
  });

  describe("verticalBarMiddle", () => {
    it("should be &boxv;", () => {
      // act
      const actual = decorator.verticalBarMiddle();

      // assert
      expect(actual).to.equal("&boxv;");
    });
  });

  describe("verticalBarStart", () => {
    it("should be &boxdr;", () => {
      // act
      const actual = decorator.verticalBarStart();

      // assert
      expect(actual).to.equal("&boxdr;");
    });
  });

  describe("debugLog", () => {
    it("should return value styled with dark cyan span", () => {
      // act
      const actual = decorator.debugLog("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:darkcyan\">foo</span>");
    });
  });

  describe("diff", () => {
    it("should return value styled with red span", () => {
      // act
      const actual = decorator.diff("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:red\">foo<\/span>");
    });
  });

  describe("expect", () => {
    it("should return value styled with goldenrod span", () => {
      // act
      const actual = decorator.expect("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:goldenrod\">foo<\/span>");
    });
  });

  describe("failed", () => {
    it("should return value styled with red span", () => {
      // act
      const actual = decorator.failed("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:red\">foo<\/span>");
    });
  });

  describe("line", () => {
    it("should return value in a span", () => {
      // act
      const actual = decorator.line("foo");

      // assert
      expect(actual).to.equal("<span>foo<\/span>");
    });
  });

  describe("given", () => {
    it("should return value styled with goldenrod span", () => {
      // act
      const actual = decorator.given("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:goldenrod\">foo<\/span>");
    });
  });

  describe("inconclusive", () => {
    it("should return value styled with goldenrod span", () => {
      // act
      const actual = decorator.inconclusive("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:goldenrod\">foo<\/span>");
    });
  });

  describe("passed", () => {
    it("should return value styled with green span", () => {
      // act
      const actual = decorator.passed("foo");

      // assert
      expect(actual).to.equal("<span style=\"color:green\">foo<\/span>");
    });
  });
});
