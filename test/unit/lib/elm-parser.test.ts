"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createElmParser, ElmNodeResult, ElmParser, ElmParserImp} from "../../../lib/elm-parser";
import {ElmToken, ElmTokenizer, ElmTokenType} from "../../../lib/elm-tokenizer";
import {Logger} from "../../../lib/logger";
import {ElmTypeHelper, makeElmTypeHelper} from "../../../lib/elm-type-helper";
import {ElmCodeHelper, makeElmCodeHelper} from "../../../lib/elm-code-helper";
import {ElmNode, ElmNodeType} from "../../../lib/plugin";
import {createElmNodeHelper, ElmNodeHelper} from "../../../lib/elm-node-helper";

const expect = chai.expect;
chai.use(SinonChai);

describe("lib elm-parser", () => {
  const RewiredParser = rewire("../../../lib/elm-parser");
  let parserImp: ElmParserImp;
  let mockLogger: Logger;
  let mockNodeHelper: ElmNodeHelper;
  let mockTokenizer: ElmTokenizer;
  let mockTokenize: Sinon.SinonStub;
  let mockMakeElmCodeHelper: Sinon.SinonSpy;
  let mockMakeElmTypeHelper: Sinon.SinonStub;

  beforeEach(() => {
    const rewiredImp = RewiredParser.__get__("ElmParserImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockNodeHelper = createElmNodeHelper();
    mockTokenizer = <ElmTokenizer> {};
    mockTokenize = Sinon.stub();
    mockTokenizer.tokenize = mockTokenize;
    mockMakeElmCodeHelper = Sinon.spy(makeElmCodeHelper);
    mockMakeElmTypeHelper = Sinon.stub();
    parserImp = new rewiredImp(mockNodeHelper, mockTokenizer, mockLogger, mockMakeElmCodeHelper, mockMakeElmTypeHelper);
  });

  describe("createElmParser", () => {
    it("should return elm parser", () => {
      // act
      const actual: ElmParser = createElmParser();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("buildElmTypeHelper", () => {
    it("should call makeElmTypeHelper with the supplied module name", () => {
      // arrange
      const mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockMakeElmTypeHelper).to.have.been.calledWith("foo");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'Test' type", () => {
      // arrange
      const mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("Test", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'concat' function", () => {
      // arrange
      const mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("concat", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'describe' function", () => {
      // arrange
      const mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("describe", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'fuzz' function", () => {
      // arrange
      const mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("fuzz", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'test' function", () => {
      // arrange
      const mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("test", undefined, "bar");
    });
  });

  describe("convertToLookup", () => {
    it("should return a lookup based on token type from the supplied tokens", () => {
      // arrange
      const tokens = [];
      const commentOne =  <ElmToken> {identifier: "foo", tokenType: ElmTokenType.Comment};
      tokens.push(commentOne);
      const commentTwo = <ElmToken> {identifier: "bar", tokenType: ElmTokenType.Comment};
      tokens.push(commentTwo);
      const port = <ElmToken> {identifier: "baz", tokenType: ElmTokenType.Port};
      tokens.push(port);

      // act
      const actual = parserImp.convertToLookup(tokens);

      // assert
      expect(actual[ElmTokenType.Comment]).to.deep.equal([commentOne, commentTwo]);
      expect(actual[ElmTokenType.Port]).to.deep.equal([port]);
    });
  });

  describe("parse", () => {
    it("should call ElmTokenizer.tokenize with the supplied file path", () => {
      // arrange
      mockTokenize.returns([]);

      // act
      parserImp.parse("foo", "bar");

      // assert
      expect(mockTokenize).to.have.been.calledWith("foo");
    });

    it("should call convertToLookup with the tokens returned from ElmTokenizer.tokenize", () => {
      // arrange
      const expected = <ElmToken[]> [{identifier: "foo", tokenType: ElmTokenType.Comment}];
      mockTokenize.returns(expected);
      const mockConvertToLookup = Sinon.mock();
      mockConvertToLookup.returns({});
      parserImp.convertToLookup = mockConvertToLookup;

      // act
      parserImp.parse("foo", "bar");

      // assert
      expect(mockConvertToLookup).to.have.been.calledWith(expected);
    });

    it("should return undefined when there are no module tokens", () => {
      // arrange
      mockTokenize.returns([{identifier: "foo", tokenType: ElmTokenType.Module}]);
      const mockConvertToLookup = Sinon.mock();
      const expected = {};
      mockConvertToLookup.returns(expected);
      parserImp.convertToLookup = mockConvertToLookup;

      // act
      const actual = parserImp.parse( "foo", "bar");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should call parseTokens with the lookup returned from convertToLookup", () => {
      // arrange
      mockTokenize.returns([{identifier: "foo", tokenType: ElmTokenType.Module}]);
      const mockConvertToLookup = Sinon.mock();
      const expected = {};
      expected[ElmTokenType.Module] = {};
      mockConvertToLookup.returns(expected);
      parserImp.convertToLookup = mockConvertToLookup;
      parserImp.parseTokens = Sinon.spy();

      // act
      parserImp.parse("foo", "bar");

      // assert
      expect(parserImp.parseTokens).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call parseTokens with the testFrameworkElmModuleName", () => {
      // arrange
      mockTokenize.returns([{identifier: "foo", tokenType: ElmTokenType.Module}]);
      const mockConvertToLookup = Sinon.mock();
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = {};
      mockConvertToLookup.returns(tokenLookup);
      parserImp.convertToLookup = mockConvertToLookup;
      parserImp.parseTokens = Sinon.spy();

      // act
      parserImp.parse("foo", "bar");

      // assert
      expect(parserImp.parseTokens).to.have.been.calledWith(Sinon.match.any, "bar");
    });
  });

  describe("parseTokens", () => {
    it("should return module node when module token exists", () => {
      // arrange
      const moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      const mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns({});
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;

      // act
      const actual = parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(actual.nodeType).to.equal(ElmNodeType.Module);
      expect(actual.name).to.equal("bar");
    });

    it("should call buildElmTypeHelper with the module token identifier", () => {
      // arrange
      const moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      const mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns({});
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockBuildElmTypeHelper).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should call buildElmTypeHelper with the testFrameworkElmModuleName", () => {
      // arrange
      const moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      const mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns({});
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockBuildElmTypeHelper).to.have.been.calledWith(Sinon.match.any, "baz");
    });

    it("should call parseFirstPass with the type helper and token lookup", () => {
      // arrange
      const moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      const typeHelper = {};
      const mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns(typeHelper);
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;
      const mockParseFirstPass = Sinon.mock();
      mockParseFirstPass.returns({complete: [], partial: []});
      parserImp.parseFirstPass = mockParseFirstPass;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockParseFirstPass).to.have.been.calledWith(typeHelper, tokenLookup, "bar");
    });

    it("should call parseSecondPass with the partial results from first pass and the type helper", () => {
      // arrange
      const moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      const typeHelper = {};
      const mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns(typeHelper);
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;
      const mockParseFirstPass = Sinon.mock();
      const expected = [{node: {name: "baz"}}];
      mockParseFirstPass.returns({complete: [], partial: expected});
      parserImp.parseFirstPass = mockParseFirstPass;
      const mockParseSecondPass = Sinon.mock();
      parserImp.parseSecondPass = mockParseSecondPass;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockParseSecondPass).to.have.been.calledWith(typeHelper, expected);
    });
  });

  describe("parseFirstPass", () => {
    it("should return parsed import tokens as complete", () => {
      // arrange
      const token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.Import};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Import] = [token];
      const typeHelper = <ElmTypeHelper> {};
      const expected = {name: "baz"};
      const mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toImportNode = mockToNode;

      // act
      const actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed type tokens as complete", () => {
      // arrange
      const token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.Type};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Type] = [token];
      const typeHelper = <ElmTypeHelper> {};
      const expected = {name: "baz"};
      const mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toTypeNode = mockToNode;

      // act
      const actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed type alias tokens as complete", () => {
      // arrange
      const token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.TypeAlias};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.TypeAlias] = [token];
      const typeHelper = <ElmTypeHelper> {};
      const expected = {name: "baz"};
      const mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toTypeAliasNode = mockToNode;

      // act
      const actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed port tokens as complete", () => {
      // arrange
      const token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.Port};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.Port] = [token];
      const typeHelper = <ElmTypeHelper> {};
      const expected = {name: "baz"};
      const mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toPortNode = mockToNode;

      // act
      const actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed typed module function tokens as partial", () => {
      // arrange
      const token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.TypedModuleFunction};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.TypedModuleFunction] = [token];
      const typeHelper = <ElmTypeHelper> {};
      const expected = {name: "baz"};
      const mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toTypedModuleFunctionNode = mockToNode;

      // act
      const actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.partial).to.deep.equal([{node: expected}]);
    });

    it("should return parsed untyped module function tokens as partial", () => {
      // arrange
      const token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.UntypedModuleFunction};
      const tokenLookup = {};
      tokenLookup[ElmTokenType.UntypedModuleFunction] = [token];
      const typeHelper = <ElmTypeHelper> {};
      const expected = {name: "baz"};
      const mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toUntypedModuleFunctionNode = mockToNode;

      // act
      const actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.partial).to.deep.equal([{node: expected}]);
    });
  });

  describe("parseSecondPass", () => {
    it("should not call parseFunction when node is not a function node ", () => {
      // arrange
      const codeHelper = <ElmCodeHelper> {maxIndex: 123};
      const node = {name: "foo", code: "abc", nodeType: ElmNodeType.Type};
      const partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      const typeHelper = <ElmTypeHelper> {};
      const mockParseFunction = Sinon.mock();
      mockParseFunction.returns([]);
      parserImp.parseFunction = mockParseFunction;

      // act
      parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(mockParseFunction).not.to.have.been.called;
    });

    it("should call parseFunction to find the function dependencies", () => {
      // arrange
      const codeHelper = <ElmCodeHelper> {maxIndex: 123};
      const node = {name: "foo", code: "abc", nodeType: ElmNodeType.TypedModuleFunction};
      const partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      const typeHelper = <ElmTypeHelper> {};
      const mockParseFunction = Sinon.mock();
      mockParseFunction.returns([]);
      parserImp.parseFunction = mockParseFunction;

      // act
      parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(mockParseFunction).to.have.been.calledWith(codeHelper, typeHelper, 3);
    });

    it("should return parsed typed module function from supplied partial node", () => {
      // arrange
      const codeHelper = <ElmCodeHelper> {maxIndex: 123};
      const node = {name: "foo", code: "abc", nodeType: ElmNodeType.TypedModuleFunction};
      const partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      const typeHelper = <ElmTypeHelper> {};
      const mockParseFunction = Sinon.mock();
      const dependencies = [{name: "bar", moduleName: "baz"}];
      mockParseFunction.returns(dependencies);
      parserImp.parseFunction = mockParseFunction;

      // act
      const actual = parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(actual).to.deep.equal([{name: "foo", code: "abc", dependencies: dependencies, nodeType: ElmNodeType.TypedModuleFunction}]);
    });

    it("should return parsed untyped module function from supplied partial node", () => {
      // arrange
      const codeHelper = <ElmCodeHelper> {maxIndex: 123};
      const node = {name: "foo", code: "abc", nodeType: ElmNodeType.UntypedModuleFunction};
      const partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      const typeHelper = <ElmTypeHelper> {};
      const mockParseFunction = Sinon.mock();
      const dependencies = [{name: "bar", moduleName: "baz"}];
      mockParseFunction.returns(dependencies);
      parserImp.parseFunction = mockParseFunction;

      // act
      const actual = parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(actual).to.deep.equal([{name: "foo", code: "abc", dependencies: dependencies, nodeType: ElmNodeType.UntypedModuleFunction}]);
    });
  });

  describe("parseAlias", () => {
    it("should return name as identifier when the supplied value does not contain ' as '", () => {
      // arrange

      // act
      const actual = parserImp.parseAlias("foo bar");

      // assert
      expect(actual).to.deep.equal({alias: undefined, name: "foo bar"});
    });

    it("should return name and alias when the supplied value is in the expected format", () => {
      // arrange

      // act
      const actual = parserImp.parseAlias("foo as bar");

      // assert
      expect(actual).to.deep.equal({alias: "bar", name: "foo"});
    });
  });

  describe("parseArguments", () => {
    it("should return an empty list when the code does not contain '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo bar");

      // act
      const actual = parserImp.parseArguments(codeHelper, "foo", true);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return an empty list when the code does not type declaration and isTypedFunction is true", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo bar =");

      // act
      const actual = parserImp.parseArguments(codeHelper, "foo", true);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return arguments list when the code does not have type declaration", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo bar baz =");

      // act
      const actual = parserImp.parseArguments(codeHelper, "foo", false);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });

    it("should return arguments list when the args are destructuring tuple args", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo (bar, baz) =");

      // act
      const actual = parserImp.parseArguments(codeHelper, "foo", false);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });

    it("should return arguments list when the args are destructuring object args", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo {bar, baz} =");

      // act
      const actual = parserImp.parseArguments(codeHelper, "foo", false);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });

    it("should return arguments list when the code does have type declaration", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo -> String -> String -> String\nfoo bar baz =");

      // act
      const actual = parserImp.parseArguments(codeHelper, "foo", true);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });
  });


  describe("parseFunction", () => {
    it("should return empty list when there is no '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo baz");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return the dependency type info when there is an '=' without spaces", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo=baz");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [4], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there is an '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [6], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there is a type definition", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo : String\nfoo = baz");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [19], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there is a type definition and no spaces", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo:String\nfoo=baz");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [15], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should not return string in the dependency type info when there is an '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = \"baz\"");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should not return elm keywords in the dependency type info when there is an '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = if then else case of let in type module where import exposing as port");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return unknown types in the dependency type info when there is an '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{typeInfo: {name: "baz", moduleName: "bar"}, occurs: [6]}]);
    });

    it("should return multiple dependencies type info", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz qux quux");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");
      typeHelper.resolveType("qux");
      typeHelper.resolveType("quux");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({ occurs: [6], typeInfo: {name: "baz", moduleName: "bar"}});
      expect(actual[1]).to.deep.equal({ occurs: [10], typeInfo: {name: "qux", moduleName: "bar"}});
      expect(actual[2]).to.deep.equal({ occurs: [14], typeInfo: {name: "quux", moduleName: "bar"}});
    });

    it("should return same that occurs twice dependency with occurs indexes 6 and 10", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz baz");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({ occurs: [6, 10], typeInfo: {name: "baz", moduleName: "bar"}});
    });

    it("should return the dependency type info when there surrounded by square brackets", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = [baz]");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [7], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there surrounded by round brackets", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = (baz)");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [7], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there surrounded by curly brackets", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = {baz}");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: [7], typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there separated by commas", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz,qux,quux");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");
      typeHelper.resolveType("qux");
      typeHelper.resolveType("quux");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({ occurs: [6], typeInfo: {name: "baz", moduleName: "bar"}});
      expect(actual[1]).to.deep.equal({ occurs: [10], typeInfo: {name: "qux", moduleName: "bar"}});
      expect(actual[2]).to.deep.equal({ occurs: [14], typeInfo: {name: "quux", moduleName: "bar"}});
    });

    it("should not return ignore contents of strings in dependencies", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz \"qux\"");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");
      typeHelper.resolveType("qux");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({ occurs: [6], typeInfo: {name: "baz", moduleName: "bar"}});
    });

    it("should ignore everything after start of unterminated strings in dependencies", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz \"qux");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType("baz");
      typeHelper.resolveType("qux");

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({ occurs: [6], typeInfo: {name: "baz", moduleName: "bar"}});
    });

    it("should not return unknown types in the dependency type info when there is an '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo = baz");
      const typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolveType = () => undefined;

      // act
      const actual = parserImp.parseFunction(codeHelper, typeHelper, 3);

      // assert
      expect(actual).to.deep.equal([]);
    });
  });

  describe("parseReturnType", () => {
    it("should return undefined when there is nothing after the function name", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no semicolon after the function name", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo baz");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no semicolon after the function name is repeated on the next line", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo\nfoo");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is a semicolon after the function name and no repeat of function name", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo : baz");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is a semicolon and function name is not at the start of next line", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo : baz foo");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return the return type info when there is a type after the function name with no spaces", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo:baz\nfoo");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal({name: "baz", moduleName: "bar"});
    });

    it("should return the return type info when there is a type after the function name with normal formatting", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("foo : baz\nfoo");
      const typeHelper = makeElmTypeHelper("bar");

      // act
      const actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal({name: "baz", moduleName: "bar"});
    });
  });

  describe("parseType", () => {
    it("should return empty list when there is no '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("type A");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return type when there is an '='", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("type = A");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual).to.deep.equal([{name: "A", moduleName: "foo", parentTypeName: "bar"}]);
    });

    it("should return single type when there is no pipe", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("type = A B");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual).to.deep.equal([{name: "A", moduleName: "foo", parentTypeName: "bar"}]);
    });

    it("should return multiple types when there is '|'", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("type = A | B");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({name: "A", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[1]).to.deep.equal({name: "B", moduleName: "foo", parentTypeName: "bar"});
    });

  });

  describe("parseTypeList", () => {
    it("should return empty list when there is no '('", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("import Foo exposing");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return type list when there is an '('", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("import Foo exposing (bar, baz");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo"});
    });

    it("should return type list when there are no spaces", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("import Foo exposing(bar,baz");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo"});
    });

    it("should return type list containing exposed specific type lists", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("import Foo exposing (bar(baz,qux))");
      const typeHelper = makeElmTypeHelper("foo");

      // act
      const actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[2]).to.deep.equal({name: "qux", moduleName: "foo", parentTypeName: "bar"});
    });

    it("should return all types for list containing exposed type lists containing '..'", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("import Foo exposing (..)");
      const typeHelper = makeElmTypeHelper("foo");
      typeHelper.resolve("bar", undefined, "foo");
      typeHelper.resolve("baz", "bar", "foo");
      typeHelper.resolve("qux", "bar", "foo");

      // act
      const actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[2]).to.deep.equal({name: "qux", moduleName: "foo", parentTypeName: "bar"});
    });

    it("should return all types for list containing exposed child type lists containing '..'", () => {
      // arrange
      const codeHelper = makeElmCodeHelper("import Foo exposing (bar(..))");
      const typeHelper = makeElmTypeHelper("foo");
      typeHelper.resolve("baz", "bar", "foo");
      typeHelper.resolve("qux", "bar", "foo");

      // act
      const actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[2]).to.deep.equal({name: "qux", moduleName: "foo", parentTypeName: "bar"});
    });
  });

  describe("toBaseNode", () => {
    it("should return a node with the code from the supplied token", () => {
      // arrange
      const token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};

      // act
      const actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.code).to.equal("bar");
    });

    it("should return a node with the end from the supplied token", () => {
      // arrange
      const expected = { columnNumber: 123, lineNumber: 456 };
      const token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      token.end = expected;

      // act
      const actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.end).to.equal(expected);
    });

    it("should return a node with the name from the supplied name", () => {
      // arrange
      const expected = { columnNumber: 123, lineNumber: 456 };
      const token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      token.end = expected;

      // act
      const actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.name).to.equal("baz");
    });

    it("should return a node with the type from converting the supplied token type", () => {
      // arrange
      const expected = ElmNodeType.Port;
      const token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      const mockToNodeType = Sinon.mock();
      mockToNodeType.returns(expected);
      parserImp.toNodeType = mockToNodeType;

      // act
      const actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(parserImp.toNodeType).to.have.been.calledWith(ElmTokenType.TypedModuleFunction);
      expect(actual.nodeType).to.equal(expected);
    });

    it("should return a node with start from the supplied token", () => {
      // arrange
      const expected = { columnNumber: 123, lineNumber: 456 };
      const token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      token.start = expected;

      // act
      const actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.start).to.equal(expected);
    });
  });

  describe("toNodeType", () => {
    it("should return node type of 'Import' when token type is 'Import'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.Import);

      // assert
      expect(actual).to.equal(ElmNodeType.Import);
    });

    it("should return node type of 'Module' when token type is 'Module'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.Module);

      // assert
      expect(actual).to.equal(ElmNodeType.Module);
    });

    it("should return node type of 'Port' when token type is 'Port'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.Port);

      // assert
      expect(actual).to.equal(ElmNodeType.Port);
    });

    it("should return node type of 'Type' when token type is 'Type'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.Type);

      // assert
      expect(actual).to.equal(ElmNodeType.Type);
    });

    it("should return node type of 'TypeAlias' when token type is 'TypeAlias'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.TypeAlias);

      // assert
      expect(actual).to.equal(ElmNodeType.TypeAlias);
    });

    it("should return node type of 'TypedModuleFunction' when token type is 'TypedModuleFunction'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.TypedModuleFunction);

      // assert
      expect(actual).to.equal(ElmNodeType.TypedModuleFunction);
    });

    it("should return node type of 'UntypedModuleFunction' when token type is 'UntypedModuleFunction'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.UntypedModuleFunction);

      // assert
      expect(actual).to.equal(ElmNodeType.UntypedModuleFunction);
    });

    it("should return node type of 'Unknown' when token type is 'Comment'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.Comment);

      // assert
      expect(actual).to.equal(ElmNodeType.Unknown);
    });

    it("should return node type of 'Unknown' when token type is 'Whitespace'", () => {
      // act
      const actual = parserImp.toNodeType(ElmTokenType.Whitespace);

      // assert
      expect(actual).to.equal(ElmNodeType.Unknown);
    });
  });

  describe("toImportNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      const code = "import Foo";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Import};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an import node for the supplied token", () => {
      // arrange
      const code = "import Foo";
      const exposing = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Import};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", alias: undefined, nodeType: ElmNodeType.Import, exposing});
    });

    it("should return an import node with an alias for the supplied token", () => {
      // arrange
      const code = "import Foo";
      const exposing = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo as Bar", start, end, code, tokenType: ElmTokenType.Import};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", alias: "Bar", nodeType: ElmNodeType.Import, exposing});
    });

    it("should return an import node with exposing list for the supplied token", () => {
      // arrange
      const code = "import Foo exposing (Bar, Baz)";
      const exposing = [{name: "Bar", moduleName: "Foo"}, {name: "Baz", moduleName: "Foo"}];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Import};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", alias: undefined, nodeType: ElmNodeType.Import, exposing});
    });
  });

  describe("toModuleNode", () => {
    it("should return an module node for the supplied token", () => {
      // arrange
      const code = "import Foo";
      const exposing = [];
      const children = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Module};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toModuleNode(typeHelper, token, children);

      // assert
      expect(actual).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Module, children, exposing});
    });

    it("should return an module node with the supplied children for the supplied token", () => {
      // arrange
      const code = "import Foo";
      const exposing = [];
      const children = <ElmNode[]>[{name: "qux"}];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Module};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toModuleNode(typeHelper, token, children);

      // assert
      expect(actual).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Module, children, exposing});
    });
  });

  describe("toPortNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      const code = "port foo : () -> msg -> Sub msg";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.Port};

      // act
      const actual = parserImp.toPortNode(token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an port node for the supplied token", () => {
      // arrange
      const code = "port foo : () -> msg -> Sub msg";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.Port};

      // act
      const actual = parserImp.toPortNode(token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.Port});
    });
  });

  describe("toTypeNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      const code = "type Foo";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Type};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toTypeNode(typeHelper, "abc", token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an type node for the supplied token", () => {
      // arrange
      const code = "type Foo";
      const dependencies = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Type};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toTypeNode(typeHelper, "abc", token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Type, dependencies});
    });

    it("should return an type node with dependency list for the supplied token", () => {
      // arrange
      const code = "type Foo = Bar | Baz";
      const dependencies = [
        {name: "Bar", moduleName: "abc", parentTypeName: "Foo"},
        {name: "Baz", moduleName: "abc", parentTypeName: "Foo"}
        ];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Type};
      const typeHelper = makeElmTypeHelper("abc");

      // act
      const actual = parserImp.toTypeNode(typeHelper, "abc", token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Type, dependencies});
    });
  });

  describe("toTypeAliasNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      const code = "type alias Foo = { Bar: String }";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.TypeAlias};

      // act
      const actual = parserImp.toTypeAliasNode(token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an typeAlias node for the supplied token", () => {
      // arrange
      const code = "type alias Foo = { Bar: String }";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.TypeAlias};

      // act
      const actual = parserImp.toTypeAliasNode(token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.TypeAlias});
    });
  });

  describe("toTypedModuleFunctionNode", () => {
    it("should call typeHelper.resolve with the function identifier", () => {
      // arrange
      const code = "foo: Int\nfoo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve = Sinon.spy(typeHelper.resolve);
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(typeHelper.resolve).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call typeHelper.resolve with undefined parentTypeName", () => {
      // arrange
      const code = "foo: Int\nfoo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve = Sinon.spy(typeHelper.resolve);
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(typeHelper.resolve).to.have.been.calledWith(Sinon.match.any, undefined, Sinon.match.any);
    });

    it("should call typeHelper.resolve with the supplied moduleName", () => {
      // arrange
      const code = "foo: Int\nfoo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve = Sinon.spy(typeHelper.resolve);
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(typeHelper.resolve).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "def");
    });

    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      const code = "foo: Int\nfoo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      const actual = parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an untyped module function node for the supplied token when the return type cannot be determined", () => {
      // arrange
      const code = "foo\nfoo = 123";
      const args = [];
      const dependencies = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      const actual = parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });

    it("should return an typed module function node for the supplied token", () => {
      // arrange
      const code = "foo: Int\nfoo = 123";
      const args = [];
      const dependencies = [];
      const returnType = { name: "Int", moduleName: "Basics"};
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;
      const nodeType = ElmNodeType.TypedModuleFunction;

      // act
      const actual = parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "foo", returnType, nodeType, arguments: args, dependencies});
    });

    it("should return an typed module function node with arguments from parseArguments", () => {
      // arrange
      const code = "foo: Int\nfoo = bar 123 && baz 456";
      const args = ["qux"];
      const dependencies = [];
      const returnType = { name: "Int", moduleName: "Basics"};
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolveType("bar");
      typeHelper.resolveType("baz");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns(args);
      parserImp.parseArguments = mockParseArguments;
      const nodeType = ElmNodeType.TypedModuleFunction;

      // act
      const actual = parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", returnType, nodeType, arguments: ["qux"], dependencies});
    });

    it("should return an typed module function node with no dependencies for known references for the supplied token", () => {
      // arrange
      const code = "foo: Int\nfoo = bar 123 && baz 456";
      const args = [];
      const dependencies = [];
      const returnType = { name: "Int", moduleName: "Basics"};
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolveType("bar");
      typeHelper.resolveType("baz");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;
      const nodeType = ElmNodeType.TypedModuleFunction;

      // act
      const actual = parserImp.toTypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "foo", returnType, nodeType, arguments: args, dependencies});
    });
  });

  describe("toUntypedModuleFunctionNode", () => {
    it("should call typeHelper.resolve with the function identifier", () => {
      // arrange
      const code = "foo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve = Sinon.spy(typeHelper.resolve);
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(typeHelper.resolve).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call typeHelper.resolve with undefined parentTypeName", () => {
      // arrange
      const code = "foo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve = Sinon.spy(typeHelper.resolve);
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(typeHelper.resolve).to.have.been.calledWith(Sinon.match.any, undefined, Sinon.match.any);
    });

    it("should call typeHelper.resolve with the supplied moduleName", () => {
      // arrange
      const code = "foo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve = Sinon.spy(typeHelper.resolve);
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(typeHelper.resolve).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "def");
    });

    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      const code = "foo = 123";
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      const actual = parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an untyped module function node for the supplied token", () => {
      // arrange
      const code = "foo = 123";
      const args = [];
      const dependencies = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      const actual = parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });

    it("should return an untyped module function node with args return from parseArguments", () => {
      // arrange
      const code = "foo = bar 123 && baz 456";
      const args = ["qux"];
      const dependencies = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolveType("bar");
      typeHelper.resolveType("baz");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns(args);
      parserImp.parseArguments = mockParseArguments;

      // act
      const actual = parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });

    it("should return an untyped module function node with no dependencies for known references for the supplied token", () => {
      // arrange
      const code = "foo = bar 123 && baz 456";
      const args = [];
      const dependencies = [];
      const start = {columnNumber: 12, lineNumber: 34};
      const end = {columnNumber: 56, lineNumber: 78};
      const token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      const typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolveType("bar");
      typeHelper.resolveType("baz");
      const mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      const actual = parserImp.toUntypedModuleFunctionNode(typeHelper, "def", token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });
  });
});
