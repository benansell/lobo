"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import {Comparer, ComparerImp, createComparer} from "../../../lib/comparer";
import {Logger} from "../../../lib/logger";

let expect = chai.expect;

describe("lib compare", () => {
  let comparer: ComparerImp;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = <Logger><{}> Sinon.mock();
    mockLogger.error = Sinon.spy();
    mockLogger.debug = Sinon.spy();
    comparer = new ComparerImp(mockLogger);
  });

  describe("createCompare", () => {
    it("should return compare", () => {
      // act
      let actual: Comparer = createComparer();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("diff", () => {
    it("should hint to whole value when a union type", () => {
      // act
      let actual = comparer.diff("Foo", "FooBar");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("   ^^^");
    });

    it("should not add hint to quotes when on left value when left is not string representation of right numeric value", () => {
      // act
      let actual = comparer.diff("\"123\"", "456");

      // assert
      expect(actual.left).to.equal("     ");
      expect(actual.right).to.equal("^^^");
    });

    it("should add hint to quotes when on left value when left is string representation of right numeric value", () => {
      // act
      let actual = comparer.diff("\"123\"", "123");

      // assert
      expect(actual.left).to.equal("^   ^");
      expect(actual.right).to.equal("   ");
    });

    it("should add hint to quotes when on right value when right is string representation of left numeric value", () => {
      // act
      let actual = comparer.diff("123", "\"123\"");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("^   ^");
    });

    it("should diff string value and empty string value", () => {
      // act
      let actual = comparer.diff("\"\"", "\"baz\"");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal(" ^^^ ");
    });

    it("should not add hint to position of quotes in string value", () => {
      // act
      let actual = comparer.diff("\"foobar\"", "\"baz\"");

      // assert
      expect(actual.left).to.equal(" ^^^^^^ ");
      expect(actual.right).to.equal("     ");
    });

    it("should not add hint two empty lists", () => {
      // act
      let actual = comparer.diff("[]", "[]");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal("  ");
    });

    it("should add hint for single item list with different values", () => {
      // act
      let actual = comparer.diff("[1]", "[2]");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal(" ^ ");
    });

    it("should add hint for single missing item in list", () => {
      // act
      let actual = comparer.diff("[1,2,3]", "[1,3]");

      // assert
      expect(actual.left).to.equal("   ^   ");
      expect(actual.right).to.equal("     ");
    });

    it("should add hint for missing items in both lists", () => {
      // act
      let actual = comparer.diff("[1,2,3]", "[1,3,4]");

      // assert
      expect(actual.left).to.equal("   ^   ");
      expect(actual.right).to.equal("     ^ ");
    });

    it("should add hint for missing item in list with repeated value", () => {
      // act
      let actual = comparer.diff("[1,1]", "[1,2,1]");

      // assert
      expect(actual.left).to.equal("     ");
      expect(actual.right).to.equal("   ^   ");
    });

    it("should add hint for missing tuple item in list", () => {
      // act
      let actual = comparer.diff("[(1,true),(2,false)]", "[(1,true)]");

      // assert
      expect(actual.left).to.equal("          ^^^^^^^^^ ");
      expect(actual.right).to.equal("          ");
    });

    it("should not add hint to position of brackets in list value", () => {
      // act
      let actual = comparer.diff("[1,2,3]", "[45,6,7]");

      // assert
      expect(actual.left).to.equal("       ");
      expect(actual.right).to.equal(" ^^ ^ ^ ");
    });

    it("should add hint to differences in list values when left is longer than right", () => {
      // act
      let actual = comparer.diff("[1,2,3]", "[5,6]");

      // assert
      expect(actual.left).to.equal("     ^ ");
      expect(actual.right).to.equal(" ^ ^ ");
    });

    it("should add hint to differences in list values when right is longer than left", () => {
      // act
      let actual = comparer.diff("[1,2]", "[5,6,7]");

      // assert
      expect(actual.left).to.equal("     ");
      expect(actual.right).to.equal(" ^ ^ ^ ");
    });

    it("should add hint to differences when union", () => {
      // act
      let actual = comparer.diff("Nothing", "Just 1");

      // assert
      expect(actual.left).to.equal("^^^^^^^");
      expect(actual.right).to.equal("     ^");
    });

    it("should add hint to differences when union with brackets", () => {
      // act
      let actual = comparer.diff("Foo", "Bar (Just 1)");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("^^^ ^^^^^^^^");
    });

    it("should add hint to differences when both union with brackets", () => {
      // act
      let actual = comparer.diff("Foo (Just 1)", "Foo (Just 2)");

      // assert
      expect(actual.left).to.equal("            ");
      expect(actual.right).to.equal("          ^ ");
    });

    it("should add hint to differences when both union of different lengths with brackets", () => {
      // act
      let actual = comparer.diff("Foo", "Foo (Bar 1) Baz");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("    ^^^^^^^^^^^");
    });

    it("should add hint to differences when union with brackets", () => {
      // act
      let actual = comparer.diff("Foo \"bar\" True", "Baz (Just 1)");

      // assert
      expect(actual.left).to.equal("          ^^^^");
      expect(actual.right).to.equal("^^^ ^^^^^^^^");
    });

    it("should add hint to differences when union with different records no common fields", () => {
      // act
      let actual = comparer.diff("Foo { id = 1 }", "Baz { name = \"baz\" }");

      // assert
      expect(actual.left).to.equal("    ^^^^^^^^^^");
      expect(actual.right).to.equal("^^^ ^^^^^^^^^^^^^^^^");
    });

    it("should add hint to differences when union with different records 1 common field", () => {
      // act
      let actual = comparer.diff("Foo { id = 1 }", "Baz { id = 2, name = \"baz\" }");

      // assert
      expect(actual.left).to.equal("              ");
      expect(actual.right).to.equal("^^^        ^  ^^^^^^^^^^^^  ");
    });

    it("should add hint to differences when union with different records 1 common field", () => {
      // act
      let actual = comparer.diff("{ id = 1, version = \"bar\" }", "{ id = 2, name = \"foo\", version = \"baz\" }");

      // assert
      expect(actual.left).to.equal("                           ");
      expect(actual.right).to.equal("       ^  ^^^^^^^^^^^^               ^   ");
    });

    it("should not add hint to position of brackets in record value", () => {
      // act
      let actual = comparer.diff("{ id = 1 }", "{ id = 2 }");

      // assert
      expect(actual.left).to.equal("          ");
      expect(actual.right).to.equal("       ^  ");
    });

    it("should not add hint when records only contain empty lists", () => {
      // act
      let actual = comparer.diff("{ items = [] }", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("              ");
      expect(actual.right).to.equal("              ");
    });

    it("should hint record type with unsorted keys", () => {
      // act
      let actual = comparer.diff("{ id = 1, value = 10 }", "{ value = 10, id = 2 }");

      // assert
      expect(actual.left).to.equal("                      ");
      expect(actual.right).to.equal("                   ^  ");
    });

    it("should not hint embedded identical records", () => {
      // act
      let actual = comparer.diff("{ id = 1, position = { x = 1, y = 2 }}", "{ id = 1, position = { x = 1, y = 2 }}");

      // assert
      expect(actual.left).to.equal("                                      ");
      expect(actual.right).to.equal("                                      ");
    });

    it("should hint embedded different records", () => {
      // act
      let actual = comparer.diff("{ id = 1, position = { x = 1, y = 2 }}", "{ id = 1, position = { x = 1, y = 3 }}");

      // assert
      expect(actual.left).to.equal("                                      ");
      expect(actual.right).to.equal("                                  ^   ");
    });

    it("should not add hint list of 1 item of identical records", () => {
      // act
      let actual = comparer.diff("[{ id = 1 }]", "[{ id = 2 }]");

      // assert
      expect(actual.left).to.equal("            ");
      expect(actual.right).to.equal("        ^   ");
    });

    it("should not hint list of identical records", () => {
      // act
      let actual = comparer.diff("[{ id = 1 },{ id = 2 }]", "[{ id = 1 },{ id = 2 }]");

      // assert
      expect(actual.left).to.equal("                       ");
      expect(actual.right).to.equal("                       ");
    });

    it("should hint list of records where one list is empty and other list has 1 item", () => {
      // act
      let actual = comparer.diff("[]", "[{ id = 1 }]");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal(" ^^^^^^^^^^ ");
    });

    it("should hint list of records where one list is empty and other list has 2 items", () => {
      // act
      let actual = comparer.diff("[]", "[{ id = 1 },{ id = 1 }]");

      // assert
      expect(actual.left).to.equal("  ");
      expect(actual.right).to.equal(" ^^^^^^^^^^^^^^^^^^^^^ ");
    });

    it("should not hint list of identical records", () => {
      // act
      let actual = comparer.diff("[{ id = 1 },{ id = 2 }]", "[{ id = 1 },{ id = 2 }]");

      // assert
      expect(actual.left).to.equal("                       ");
      expect(actual.right).to.equal("                       ");
    });

    it("should hint list of records of different lengths 1 key", () => {
      // act
      let actual = comparer.diff("{ items = [{ id = 1 }]}", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("           ^^^^^^^^^^  ");
      expect(actual.right).to.equal("              ");
    });

    it("should hint list of records of different lengths 2 keys", () => {
      // act
      let actual = comparer.diff("{ items = [{ id = 1, version = 2 }]}", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("           ^^^^^^^^^^^^^^^^^^^^^^^  ");
      expect(actual.right).to.equal("              ");
    });

    it("should hint list of records of different lengths 2 keys", () => {
      // act
      let actual = comparer.diff("{ items = [{ id = 1, version = 2 },{ id = 2, version = 3 }]}", "{ items = [] }");

      // assert
      expect(actual.left).to.equal("           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ");
      expect(actual.right).to.equal("              ");
    });

    it("should catch diff error and return '' for left when it is undefined", () => {
      // act
      let actual = comparer.diff(undefined, "foo");

      // assert
      expect(actual.left).to.equal("");
    });

    it("should catch diff error and return '' for right when it is undefined", () => {
      // act
      let actual = comparer.diff("foo", undefined);

      // assert
      expect(actual.right).to.equal("");
    });

    it("should catch diff error and return '?' repeated for length of left", () => {
      // act
      let actual = comparer.diff("foo", undefined);

      // assert
      expect(actual.left).to.match(/\?{3}/);
    });

    it("should catch diff error and return '?' repeated for length of right", () => {
      // act
      let actual = comparer.diff(undefined, "foo");

      // assert
      expect(actual.right).to.match(/\?{3}/);
    });
  });

  describe("diffValue", () => {
    it("should not add a left or right hint when the inputs are equal", () => {
      // act
      let actual = comparer.diffValue("foo", "foo");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("   ");
    });

    it("should add a right hint when the inputs are different but of equal length", () => {
      // act
      let actual = comparer.diffValue("bar", "baz");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("  ^");
    });

    it("should add a right hint when the inputs are different and right is longer", () => {
      // act
      let actual = comparer.diffValue("foo", "foobar");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("   ^^^");
    });

    it("should add a left hint when the inputs are different and left is longer contains right", () => {
      // act
      let actual = comparer.diffValue("foobar", "foo");

      // assert
      expect(actual.left).to.equal("   ^^^");
      expect(actual.right).to.equal("   ");
    });

    it("should add a left hint when the inputs are different and left is longer contains right", () => {
      // act
      let actual = comparer.diffValue("foobar", "bar");

      // assert
      expect(actual.left).to.equal("^^^   ");
      expect(actual.right).to.equal("   ");
    });

    it("should add a right hint when the inputs are different and right is longer contains left", () => {
      // act
      let actual = comparer.diffValue("bar", "foobar");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("^^^   ");
    });

    it("should add a left hint when the inputs are different and right is longer does not contain left", () => {
      // act
      let actual = comparer.diffValue("baz", "foobar");

      // assert
      expect(actual.left).to.equal("   ");
      expect(actual.right).to.equal("^^^^^^");
    });

    it("should add a left hint when the inputs are different and right is longer left in middle", () => {
      // act
      let actual = comparer.diffValue("faobar", "ob");

      // assert
      expect(actual.left).to.equal("^^  ^^");
      expect(actual.right).to.equal("  ");
    });

    it("should hint around decimal when only one side has a decimal", () => {
      // act
      let actual = comparer.diffValue("24.0", "124");

      // assert
      expect(actual.left).to.equal("   ^");
      expect(actual.right).to.equal("^  ");
    });

    it("should hint around decimal when both sides have a decimal", () => {
      // act
      let actual = comparer.diffValue("24.0", "124.0");

      // assert
      expect(actual.left).to.equal("    ");
      expect(actual.right).to.equal("^    ");
    });

    it("should hint around decimal when one side is negative", () => {
      // act
      let actual = comparer.diffValue("-224.0", "124.0");

      // assert
      expect(actual.left).to.equal("^^    ");
      expect(actual.right).to.equal("     ");
    });

    it("should hint around decimal and exponent when both sides have a exponent", () => {
      // act
      let actual = comparer.diffValue("24.0e+123", "124.0");

      // assert
      expect(actual.left).to.equal("    ^^^^^");
      expect(actual.right).to.equal("^    ");
    });

    it("should hint when one side is NaN", () => {
      // act
      let actual = comparer.diffValue("24.0", "NaN");

      // assert
      expect(actual.left).to.equal("^^^^");
      expect(actual.right).to.equal("   ");
    });

    it("should hint when one side is Infinite", () => {
      // act
      let actual = comparer.diffValue("24.0", "Infinity");

      // assert
      expect(actual.left).to.equal("    ");
      expect(actual.right).to.equal("^^^^^^^^");
    });
  });
});
