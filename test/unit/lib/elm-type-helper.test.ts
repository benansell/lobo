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
      let actual = typeHelper.findAllChildTypes("bar");

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return child types when the supplied name matches a known module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let expected = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, expected);

      // act
      let actual = typeHelper.findAllChildTypes("bar");

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should return child types when the supplied name matches a known module alias", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let expected = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", "baz", expected);

      // act
      let actual = typeHelper.findAllChildTypes("baz");

      // assert
      expect(actual).to.deep.equal(expected);
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

  describe("resolveExcludingDefaultModule", () => {
    it("should return type info when the type is a known type and parent type is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveExcludingDefaultModule("def", undefined);

      // assert
      expect(actual).to.equal(types[1]);
    });

    it("should return undefined when the type for an unknown type and parent type is undefined", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveExcludingDefaultModule("ghi", undefined);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return type info when the type is a known type and parent type is supplied", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "ghi", parentTypeName: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveExcludingDefaultModule("ghi", "def");

      // assert
      expect(actual).to.deep.equal({name: "ghi", moduleName: "bar", parentTypeName: "def"});
    });

    it("should return undefined when the type for an unknown type and parent type is from default module", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);
      typeHelper.resolve("123", "456", "foo");

      // act
      let actual = typeHelper.resolveExcludingDefaultModule("789", "456");

      // assert
      expect(actual).to.be.undefined;
    });
  });

  describe("resolveModule", () => {
    it("should return existing module when supplied type has a known module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveModule({name: "ghi", moduleName: "bar"});

      // assert
      expect(actual).to.deep.equal({name: "bar", exposing: types, alias: undefined});
    });

    it("should return new module containing supplied type when supplied type has an unknown module name", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      typeHelper.addModule("bar", undefined, types);

      // act
      let actual = typeHelper.resolveModule({name: "ghi", moduleName: "qux"});

      // assert
      expect(actual).to.deep.equal({name: "qux", exposing: [{name: "ghi", moduleName: "qux"}], alias: undefined});
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
    it("should return existing type when type name exists within the module", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      let moduleInfo = {name: "bar", exposing: types};

      // act
      let actual = typeHelper.resolveType(moduleInfo, types[1]);

      // assert
      expect(actual).to.deep.equal(types[1]);
    });

    it("should return undefined when type name does not exists within the module", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");
      let types = [{name: "abc", moduleName: "bar"}, {name: "def", moduleName: "bar"}];
      let moduleInfo = {name: "bar", exposing: types};

      // act
      let actual = typeHelper.resolveType(moduleInfo, {name: "ghi", "moduleName": "bar"});

      // assert
      expect(actual).to.be.undefined;
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

    it("should return type info with supplied name when it contains a '.' and does not start with upper case letter", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("bar.abc", "baz", "qux");

      // assert
      expect(actual.name).to.equal("bar.abc");
    });

    it("should return type info with name derived from name when it contains a '.' and starts with an upper case letter", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("Bar.abc", "baz", "qux");

      // assert
      expect(actual.name).to.equal("abc");
    });

    it("should return type info with module name derived from name when it contains a '.' and starts with an upper case letter", () => {
      // arrange
      let typeHelper = new ElmTypeHelperImp("foo");

      // act
      let actual = typeHelper.toModuleTypeInfo("Bar.abc", "baz", "qux");

      // assert
      expect(actual.moduleName).to.equal("Bar");
    });
  });
});
