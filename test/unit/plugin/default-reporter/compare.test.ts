"use strict";

import * as chai from "chai";
import * as sinon from "sinon";
import {Compare, CompareImp, createCompare} from "../../../../plugin/default-reporter/compare";
import {Logger} from "../../../../lib/logger";

let expect = chai.expect;

describe("plugin default-reporter compare", () => {
  let compare: CompareImp;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = <any> sinon.mock();
    compare = new CompareImp(mockLogger);
  });

  describe("createCompare", () => {
    it("should return compare", () => {
      // act
      let actual: Compare = createCompare();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("diff", () => {
    it("should hint to whole value when a union type", () => {
      // act
      let actual = compare.diff("Foo", "FooBar");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("   ^^^");
    });

    it("should not add hint to position of quotes in string value", () => {
      // act
      let actual = compare.diff("\"foobar\"", "\"baz\"");

      // assert
      expect(actual.left).to.equal(" ^^^^^^ ");
      expect(actual.right).to.equal("     ");
    });

    it("should not add hint two empty lists", () => {
      // act
      let actual = compare.diff("[]", "[]");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal("  ");
    });

    it("should add hint for single item list with different values", () => {
      // act
      let actual = compare.diff("[1]", "[2]");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal(" ^ ");
    });

    it("should not add hint to position of brackets in list value", () => {
      // act
      let actual = compare.diff("[1,2,3]", "[45,6,7]");

      // assert
      expect(actual.left).to.equal("       ");
      expect(actual.right).to.equal(" ^^ ^ ^ ");
    });

    it("should add hint to differences in list values", () => {
      // act
      let actual = compare.diff("[1,2,3]", "[5,6]");

      // assert
      expect(actual.left).to.equal("     ^ ");
      expect(actual.right).to.equal(" ^ ^ ");
    });

    it("should add hint to differences in list values", () => {
      // act
      let actual = compare.diff("[1,2]", "[5,6,7]");

      // assert
      expect(actual.left).to.equal("     ");
      expect(actual.right).to.equal(" ^ ^ ^ ");
    });

    it("should add hint to differences when union", () => {
      // act
      let actual = compare.diff("Nothing", "Just 1");

      // assert
      expect(actual.left).to.equal("^^^^^^^");
      expect(actual.right).to.equal("     ^");
    });

    it("should add hint to differences when union with brackets", () => {
      // act
      let actual = compare.diff("Foo", "Bar (Just 1)");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("^^^ ^^^^^^^^");
    });

    it("should add hint to differences when union with brackets", () => {
      // act
      let actual = compare.diff("Foo \"bar\" True", "Baz (Just 1)");

      // assert
      expect(actual.left).to.equal("          ^^^^");
      expect(actual.right).to.equal("^^^ ^^^^^^^^");
    });

    it("should add hint to differences when union with different records no common fields", () => {
      // act
      let actual = compare.diff("Foo { id = 1 }", "Baz { name = \"baz\" }");

      // assert
      expect(actual.left).to.equal("    ^^^^^^^^^^");
      expect(actual.right).to.equal("^^^ ^^^^^^^^^^^^^^^^");
    });

    it("should add hint to differences when union with different records 1 common field", () => {
      // act
      let actual = compare.diff("Foo { id = 1 }", "Baz { id = 2, name = \"baz\" }");

      // assert
      expect(actual.left).to.equal("              ");
      expect(actual.right).to.equal("^^^        ^  ^^^^^^^^^^^^  ");
    });

    it("should add hint to differences when union with different records 1 common field", () => {
      // act
      let actual = compare.diff("{ id = 1, version = \"bar\" }", "{ id = 2, name = \"foo\", version = \"baz\" }");

      // assert
      expect(actual.left).to.equal("                           ");
      expect(actual.right).to.equal("       ^  ^^^^^^^^^^^^               ^   ");
    });

    it("should not add hint to position of brackets in record value", () => {
      // act
      let actual = compare.diff("{ id = 1 }", "{ id = 2 }");

      // assert
      expect(actual.left).to.equal("          ");
      expect(actual.right).to.equal("       ^  ");
    });

    it("should not add hint when records only contain empty lists", () => {
      // act
      let actual = compare.diff("{ items = [] }", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("              ");
      expect(actual.right).to.equal("              ");
    });

    it("should hint record type with unsorted keys", () => {
      // act
      let actual = compare.diff("{ id = 1, value = 10 }", "{ value = 10, id = 2 }");

      // assert
      expect(actual.left).to.equal("                      ");
      expect(actual.right).to.equal("                   ^  ");
    });

    it("should not hint embedded identical records", () => {
      // act
      let actual = compare.diff("{ id = 1, position = { x = 1, y = 2 }}", "{ id = 1, position = { x = 1, y = 2 }}");

      // assert
      expect(actual.left).to.equal("                                      ");
      expect(actual.right).to.equal("                                      ");
    });

    it("should hint embedded different records", () => {
      // act
      let actual = compare.diff("{ id = 1, position = { x = 1, y = 2 }}", "{ id = 1, position = { x = 1, y = 3 }}");

      // assert
      expect(actual.left).to.equal("                                      ");
      expect(actual.right).to.equal("                                  ^   ");
    });

    it("should not add hint list of 1 item of identical records", () => {
      // act
      let actual = compare.diff("[{ id = 1 }]", "[{ id = 2 }]");

      // assert
      expect(actual.left).to.equal("            ");
      expect(actual.right).to.equal("        ^   ");
    });

    it("should not hint list of identical records", () => {
      // act
      let actual = compare.diff("[{ id = 1 },{ id = 2 }]", "[{ id = 1 },{ id = 2 }]");

      // assert
      expect(actual.left).to.equal("                       ");
      expect(actual.right).to.equal("                       ");
    });

    it("should hint list of records where one list is empty and other list has 1 item", () => {
      // act
      let actual = compare.diff("[]", "[{ id = 1 }]");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal(" ^^^^^^^^^^ ");
    });

    it("should hint list of records where one list is empty and other list has 2 items", () => {
      // act
      let actual = compare.diff("[]", "[{ id = 1 },{ id = 1 }]");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal(" ^^^^^^^^^^^^^^^^^^^^^ ");
    });

    it("should not hint list of identical records", () => {
      // act
      let actual = compare.diff("[{ id = 1 },{ id = 2 }]", "[{ id = 1 },{ id = 2 }]");

      // assert
      expect(actual.left).to.equal("                       ");
      expect(actual.right).to.equal("                       ");
    });

    it("should hint list of records of different lengths 1 key", () => {
      // act
      let actual = compare.diff("{ items = [{ id = 1 }]}", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("           ^^^^^^^^^^  ");
      expect(actual.right).to.equal("              ");
    });

    it("should hint list of records of different lengths 2 keys", () => {
      // act
      let actual = compare.diff("{ items = [{ id = 1, version = 2 }]}", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("           ^^^^^^^^^^^^^^^^^^^^^^^  ");
      expect(actual.right).to.equal("              ");
    });

    it("should hint list of records of different lengths 2 keys", () => {
      // act
      let actual = compare.diff("{ items = [{ id = 1, version = 2 },{ id = 2, version = 3 }]}", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ");
      expect(actual.right).to.equal("              ");
    });
  });

  describe("compare.diffValue", () => {
    it("should not add a left or right hint when the inputs are equal", () => {
      // act
      let actual = compare.diffValue("foo", "foo");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("   ");
    });

    it("should add a right hint when the inputs are different but of equal length", () => {
      // act
      let actual = compare.diffValue("bar", "baz");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("  ^");
    });

    it("should add a right hint when the inputs are different and right is longer", () => {
      // act
      let actual = compare.diffValue("foo", "foobar");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("   ^^^");
    });

    it("should add a left hint when the inputs are different and left is longer contains right",
      () => {
        // act
        let actual = compare.diffValue("foobar", "foo");

        // assert
        expect(actual.left).to.equal("   ^^^");
        expect(actual.right).to.equal("   ");
      });

    it("should add a left hint when the inputs are different and left is longer contains right",
      () => {
        // act
        let actual = compare.diffValue("foobar", "bar");

        // assert
        expect(actual.left).to.equal("^^^   ");
        expect(actual.right).to.equal("   ");
      });

    it("should add a left hint when the inputs are different and left is longer does not contain right",
      () => {
        // act
        let actual = compare.diffValue("foobar", "baz");

        // assert
        expect(actual.left).to.equal("^^^^^^");
        expect(actual.right).to.equal("   ");
      });

    it("should add a left hint when the inputs are different and right is longer does not contain left",
      () => {
        // act
        let actual = compare.diffValue("baz", "foobar");

        // assert
        expect(actual.left).to.equal("   ");
        expect(actual.right).to.equal("^^^^^^");
      });

    it("should add a left hint when the inputs are different and right is longer left in middle",
      () => {
        // act
        let actual = compare.diffValue("faobar", "ob");

        // assert
        expect(actual.left).to.equal("^^  ^^");
        expect(actual.right).to.equal("  ");
      });

    it("should hint around decimal when only one side has a decimal", () => {
      // act
      let actual = compare.diffValue("24.0", "124");

      // assert
      expect(actual.left).to.equal("   ^");
      expect(actual.right).to.equal("^  ");
    });

    it("should hint around decimal when both sides have a decimal", () => {
      // act
      let actual = compare.diffValue("24.0", "124.0");

      // assert
      expect(actual.left).to.equal("    ");
      expect(actual.right).to.equal("^    ");
    });

    it("should hint around decimal when one side is negative", () => {
      // act
      let actual = compare.diffValue("-224.0", "124.0");

      // assert
      expect(actual.left).to.equal("^^    ");
      expect(actual.right).to.equal("     ");
    });

    it("should hint around decimal and exponent when both sides have a exponent", () => {
      // act
      let actual = compare.diffValue("24.0e+123", "124.0");

      // assert
      expect(actual.left).to.equal("    ^^^^^");
      expect(actual.right).to.equal("^    ");
    });

    it("should hint when one side is NaN", () => {
      // act
      let actual = compare.diffValue("24.0", "NaN");

      // assert
      expect(actual.left).to.equal("^^^^");
      expect(actual.right).to.equal("   ");
    });

    it("should hint when one side is Infinite", () => {
      // act
      let actual = compare.diffValue("24.0", "Infinity");

      // assert
      expect(actual.left).to.equal("    ");
      expect(actual.right).to.equal("^^^^^^^^");
    });
  });
});
