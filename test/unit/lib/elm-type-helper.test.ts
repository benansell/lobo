"use strict";

import * as chai from "chai";
import * as SinonChai from "sinon-chai";
import {makeElmTypeHelper, ElmTypeHelper, ElmTypeHelperImp} from "../../../lib/elm-type-helper";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib elm-type-helper", () => {

  describe("makeElmTypeHelper", () => {
    it("should return elm type helper", () => {
      // act
      let actual: ElmTypeHelper = makeElmTypeHelper("foo");

      // assert
      expect(actual).to.exist;
    });
  });

  describe("addModule", () => {
    it("should add a module with the supplied name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      typeHelper.addModule("bar", undefined);
      let actual = typeHelper.resolveExistingModule("bar");

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: [], alias: undefined});
    });

    it("should add a module with the supplied alias", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      typeHelper.addModule("bar", "baz");
      let actual = typeHelper.resolveExistingModule("bar");

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: [], alias: "baz"});
    });

    it("should add a module with the supplied types", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let expected = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];

      // act
      typeHelper.addModule("bar", undefined, expected);
      let actual = typeHelper.resolveExistingModule("bar");

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: expected, alias: undefined});
    });
  });

  describe("findAllChildTypes", () => {
    it("should return empty array when the supplied name does not match any of the modules", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.findAllChildTypes("bar", undefined);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return all child types when the supplied name matches a known module name and parent type is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let expected = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, expected);

      // act
      let actual = typeHelper.findAllChildTypes("bar", undefined);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should return all child types when the supplied name matches a known module alias and parent type is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let expected = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", "baz", expected);

      // act
      let actual = typeHelper.findAllChildTypes("baz", undefined);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should return child types of parent type when the supplied name matches a known module alias and parent type is supplied", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let expected = [{name: "abc", moduleName: "bar", parentTypeName: "qux"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", "baz", expected);

      // act
      let actual = typeHelper.findAllChildTypes("baz", "qux");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal(expected[0]);
    });
  });

  describe("findExposedType", () => {
    it("should return undefined when the supplied name does not match any of the module exposed types", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.findExposedType("ghi");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return child type info when the supplied name matches a known module exposed type", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.findExposedType("def");

      // assert
      expect(actual).to.equal(types[1]);
    });
  });

  describe("resolve", () => {
    it("should return type info when the type is a known type and the module name is supplied", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolve("def", undefined, "bar");

      // assert
      expect(actual).to.equal(types[1]);
    });

    it("should return type info when the type is a known type and the module name is not supplied", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolve("def", undefined, undefined);

      // assert
      expect(actual).to.equal(types[1]);
    });

    it("should return new type info for supplied module name when the type for an unknown type", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolve("ghi", undefined, "bar");

      // assert
      expect(actual).to.deep.equal({name: "ghi", moduleName: "bar"});
    });

    it("should return new type info for default module when the type for an unknown type", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolve("ghi", undefined, undefined);

      // assert
      expect(actual).to.deep.equal({name: "ghi", moduleName: "foo"});
    });

    it("should return new type info for supplied module name and parent type when the type for an unknown type", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolve("ghi", "def", "bar");

      // assert
      expect(actual).to.deep.equal({name: "ghi", moduleName: "bar", parentTypeName: "def"});
    });

    it("should return new type info for default module and supplied parent type name when the type for an unknown type", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolve("ghi", "def", undefined);

      // assert
      expect(actual).to.deep.equal({name: "ghi", moduleName: "foo", parentTypeName: "def"});
    });
  });

  describe("resolveExistingType", () => {
    it("should return existing type when type name exists within the module", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.resolve("abc", undefined, "bar");
      typeHelper.resolve("def", undefined, "bar");

      // act
      let actual = typeHelper.resolveExistingType("def", "bar");

      // assert
      expect(actual).to.deep.equal({name: "def", moduleName: "bar"});
    });

    it("should return undefined when type name does not exists within the module", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.resolve("abc", undefined, "bar");
      typeHelper.resolve("def", undefined, "bar");

      // act
      let actual = typeHelper.resolveExistingType("ghi", "bar");

      // assert
      expect(actual).to.be.undefined;
    });
  });

  describe("resolveModule", () => {
    it("should return existing module when supplied module name is known", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveModule("bar");

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: types, alias: undefined});
    });

    it("should return new module when supplied module name is unknown", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveModule("qux");

      // assert
      expect(actual).to.deep.equal({name: "qux", exposing: [], alias: undefined});
    });

    it("should return default module when supplied module name is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveModule(undefined);

      // assert
      expect(actual).to.deep.equal({name: "foo", exposing: [], alias: undefined});
    });
  });

  describe("resolveExistingModule", () => {
    it("should return existing module when supplied name known module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveExistingModule("bar");

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: types, alias: undefined});
    });

    it("should return existing module when supplied name known module alias", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", "qux", types);

      // act
      let actual = typeHelper.resolveExistingModule("qux");

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: types, alias: "qux"});
    });

    it("should return undefined when supplied name is an unknown module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveExistingModule("qux");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return default imported module when supplied name known module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.resolveExistingModule("List");

      // assert
      let types = [{name: "List", moduleName: "List"}, {name: "::", moduleName: "List"}];
      expect(actual).to.deep.equal({name: "List", exposing: types, alias: undefined});
    });
  });

  describe("resolveType", () => {
    it("should return undefined when name is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.resolveType(undefined);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return type info with supplied name for default module when name is simple", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.resolveType("bar");

      // assert
      expect(actual).to.deep.equal({name: "bar", moduleName: "foo"});
    });

    it("should return type info with function name and parent type name for dotted name of unknown module", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.resolveType("Bar.Baz");

      // assert
      expect(actual).to.deep.equal({name: "Baz", parentTypeName: "Bar", moduleName: "foo"});
    });

    it("should return type info with function name for non default module when name is full name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.addModule("Bar", undefined);

      // act
      let actual = typeHelper.resolveType("Bar.Baz");

      // assert
      expect(actual).to.deep.equal({name: "Baz", moduleName: "Bar"});
    });

    it("should return type info with function name for non default module when name is aliased full name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.addModule("Bar", "Qux");

      // act
      let actual = typeHelper.resolveType("Qux.Baz");

      // assert
      expect(actual).to.deep.equal({name: "Baz", moduleName: "Bar"});
    });

    it("should return type info with function name for non default module when name is long full name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.addModule("Bar", undefined);
      typeHelper.addModule("Bar.Baz.Qux", undefined);

      // act
      let actual = typeHelper.resolveType("Bar.Baz.Qux.Quux");

      // assert
      expect(actual).to.deep.equal({name: "Quux", moduleName: "Bar.Baz.Qux"});
    });

    it("should return type info with type name for non default module when name is long type name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.addModule("Bar", undefined);

      // act
      let actual = typeHelper.resolveType("Bar.Baz.Qux");

      // assert
      expect(actual).to.deep.equal({name: "Qux", parentTypeName: "Baz", moduleName: "Bar"});
    });

    it("should return type info with function name for non default module when name is long type name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      typeHelper.addModule("Bar", undefined);

      // act
      let actual = typeHelper.resolveType("Bar.Baz.Qux.Quux");

      // assert
      expect(actual).to.deep.equal({name: "Quux", parentTypeName: "Baz.Qux", moduleName: "Bar"});
    });
  });

  describe("toModuleTypeInfo", () => {
    it("should return type info with the supplied name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("bar", "baz", "qux");

      // assert
      expect(actual.name).to.equal("bar");
    });

    it("should return type info with the supplied parent type name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("bar", "baz", "qux");

      // assert
      expect(actual.parentTypeName).to.equal("baz");
    });

    it("should return type info with the supplied module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("bar", "baz", "qux");

      // assert
      expect(actual.moduleName).to.equal("qux");
    });

    it("should return type info with default module name when the supplied module name is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("bar", "baz", undefined);

      // assert
      expect(actual.moduleName).to.equal("foo");
    });
  });
});
