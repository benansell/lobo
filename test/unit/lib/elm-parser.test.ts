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

let expect = chai.expect;
chai.use(SinonChai);

describe("lib elm-parser", () => {
  let RewiredParser = rewire("../../../lib/elm-parser");
  let parserImp: ElmParserImp;
  let mockLogger: Logger;
  let mockNodeHelper: ElmNodeHelper;
  let mockTokenizer: ElmTokenizer;
  let mockTokenize: Sinon.SinonStub;
  let mockMakeElmCodeHelper: Sinon.SinonSpy;
  let mockMakeElmTypeHelper: Sinon.SinonStub;

  beforeEach(() => {
    let rewiredImp = RewiredParser.__get__("ElmParserImp");
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
      let actual: ElmParser = createElmParser();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("buildElmTypeHelper", () => {
    it("should call makeElmTypeHelper with the supplied module name", () => {
      // arrange
      let mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockMakeElmTypeHelper).to.have.been.calledWith("foo");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'Test' type", () => {
      // arrange
      let mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("Test", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'concat' function", () => {
      // arrange
      let mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("concat", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'describe' function", () => {
      // arrange
      let mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("describe", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'fuzz' function", () => {
      // arrange
      let mockTypeHelperResolve = Sinon.stub();
      mockMakeElmTypeHelper.returns({resolve: mockTypeHelperResolve});

      // act
      parserImp.buildElmTypeHelper("foo", "bar");

      // assert
      expect(mockTypeHelperResolve).to.have.been.calledWith("fuzz", undefined, "bar");
    });

    it("should call makeElmTypeHelper.resolve for supplied test framework 'test' function", () => {
      // arrange
      let mockTypeHelperResolve = Sinon.stub();
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
      let tokens = [];
      let commentOne =  <ElmToken> {identifier: "foo", tokenType: ElmTokenType.Comment};
      tokens.push(commentOne);
      let commentTwo = <ElmToken> {identifier: "bar", tokenType: ElmTokenType.Comment};
      tokens.push(commentTwo);
      let port = <ElmToken> {identifier: "baz", tokenType: ElmTokenType.Port};
      tokens.push(port);

      // act
      let actual = parserImp.convertToLookup(tokens);

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
      let expected = <ElmToken[]> [{identifier: "foo", tokenType: ElmTokenType.Comment}];
      mockTokenize.returns(expected);
      let mockConvertToLookup = Sinon.mock();
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
      let mockConvertToLookup = Sinon.mock();
      let expected = {};
      mockConvertToLookup.returns(expected);
      parserImp.convertToLookup = mockConvertToLookup;

      // act
      let actual = parserImp.parse( "foo", "bar");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should call parseTokens with the lookup returned from convertToLookup", () => {
      // arrange
      mockTokenize.returns([{identifier: "foo", tokenType: ElmTokenType.Module}]);
      let mockConvertToLookup = Sinon.mock();
      let expected = {};
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
      let mockConvertToLookup = Sinon.mock();
      let tokenLookup = {};
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
      let moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      let mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns({});
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;

      // act
      let actual = parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(actual.nodeType).to.equal(ElmNodeType.Module);
      expect(actual.name).to.equal("bar");
    });

    it("should call buildElmTypeHelper with the module token identifier", () => {
      // arrange
      let moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      let mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns({});
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockBuildElmTypeHelper).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should call buildElmTypeHelper with the testFrameworkElmModuleName", () => {
      // arrange
      let moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      let mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns({});
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockBuildElmTypeHelper).to.have.been.calledWith(Sinon.match.any, "baz");
    });

    it("should call parseFirstPass with the type helper and token lookup", () => {
      // arrange
      let moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      let typeHelper = {};
      let mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns(typeHelper);
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;
      let mockParseFirstPass = Sinon.mock();
      mockParseFirstPass.returns({complete: [], partial: []});
      parserImp.parseFirstPass = mockParseFirstPass;

      // act
      parserImp.parseTokens(tokenLookup, "baz");

      // assert
      expect(mockParseFirstPass).to.have.been.calledWith(typeHelper, tokenLookup, "bar");
    });

    it("should call parseSecondPass with the partial results from first pass and the type helper", () => {
      // arrange
      let moduleToken = {identifier: "bar", code: "abc", tokenType: ElmTokenType.Module};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Module] = [moduleToken];
      let typeHelper = {};
      let mockBuildElmTypeHelper = Sinon.stub();
      mockBuildElmTypeHelper.returns(typeHelper);
      parserImp.buildElmTypeHelper = mockBuildElmTypeHelper;
      let mockParseFirstPass = Sinon.mock();
      let expected = [{node: {name: "baz"}}];
      mockParseFirstPass.returns({complete: [], partial: expected});
      parserImp.parseFirstPass = mockParseFirstPass;
      let mockParseSecondPass = Sinon.mock();
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
      let token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.Import};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Import] = [token];
      let typeHelper = <ElmTypeHelper> {};
      let expected = {name: "baz"};
      let mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toImportNode = mockToNode;

      // act
      let actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed type tokens as complete", () => {
      // arrange
      let token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.Type};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Type] = [token];
      let typeHelper = <ElmTypeHelper> {};
      let expected = {name: "baz"};
      let mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toTypeNode = mockToNode;

      // act
      let actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed type alias tokens as complete", () => {
      // arrange
      let token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.TypeAlias};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.TypeAlias] = [token];
      let typeHelper = <ElmTypeHelper> {};
      let expected = {name: "baz"};
      let mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toTypeAliasNode = mockToNode;

      // act
      let actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed port tokens as complete", () => {
      // arrange
      let token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.Port};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.Port] = [token];
      let typeHelper = <ElmTypeHelper> {};
      let expected = {name: "baz"};
      let mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toPortNode = mockToNode;

      // act
      let actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.complete).to.deep.equal([expected]);
    });

    it("should return parsed typed module function tokens as partial", () => {
      // arrange
      let token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.TypedModuleFunction};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.TypedModuleFunction] = [token];
      let typeHelper = <ElmTypeHelper> {};
      let expected = {name: "baz"};
      let mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toTypedModuleFunctionNode = mockToNode;

      // act
      let actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.partial).to.deep.equal([{node: expected}]);
    });

    it("should return parsed untyped module function tokens as partial", () => {
      // arrange
      let token = {identifier: "foo", code: "abc", tokenType: ElmTokenType.UntypedModuleFunction};
      let tokenLookup = {};
      tokenLookup[ElmTokenType.UntypedModuleFunction] = [token];
      let typeHelper = <ElmTypeHelper> {};
      let expected = {name: "baz"};
      let mockToNode = Sinon.mock();
      mockToNode.returns({node: expected});
      parserImp.toUntypedModuleFunctionNode = mockToNode;

      // act
      let actual = parserImp.parseFirstPass(typeHelper, tokenLookup, "bar");

      // assert
      expect(actual.partial).to.deep.equal([{node: expected}]);
    });
  });

  describe("parseSecondPass", () => {
    it("should call parseFunction to find the function dependencies", () => {
      // arrange
      let codeHelper = <ElmCodeHelper> {maxIndex: 123};
      let node = {name: "foo", code: "abc", nodeType: ElmNodeType.TypedModuleFunction};
      let partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      let typeHelper = <ElmTypeHelper> {};
      let mockParseFunction = Sinon.mock();
      mockParseFunction.returns([]);
      parserImp.parseFunction = mockParseFunction;

      // act
      parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(mockParseFunction).to.have.been.calledWith(codeHelper, typeHelper, "foo", 3);
    });

    it("should return parsed typed module function from supplied partial node", () => {
      // arrange
      let codeHelper = <ElmCodeHelper> {maxIndex: 123};
      let node = {name: "foo", code: "abc", nodeType: ElmNodeType.TypedModuleFunction};
      let partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      let typeHelper = <ElmTypeHelper> {};
      let mockParseFunction = Sinon.mock();
      let dependencies = [{name: "bar", moduleName: "baz"}];
      mockParseFunction.returns(dependencies);
      parserImp.parseFunction = mockParseFunction;

      // act
      let actual = parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(actual).to.deep.equal([{name: "foo", code: "abc", dependencies: dependencies, nodeType: ElmNodeType.TypedModuleFunction}]);
    });

    it("should return parsed untyped module function from supplied partial node", () => {
      // arrange
      let codeHelper = <ElmCodeHelper> {maxIndex: 123};
      let node = {name: "foo", code: "abc", nodeType: ElmNodeType.UntypedModuleFunction};
      let partial = <ElmNodeResult<ElmNode>> {codeHelper: codeHelper, node: node };
      let typeHelper = <ElmTypeHelper> {};
      let mockParseFunction = Sinon.mock();
      let dependencies = [{name: "bar", moduleName: "baz"}];
      mockParseFunction.returns(dependencies);
      parserImp.parseFunction = mockParseFunction;

      // act
      let actual = parserImp.parseSecondPass(typeHelper, [partial]);

      // assert
      expect(actual).to.deep.equal([{name: "foo", code: "abc", dependencies: dependencies, nodeType: ElmNodeType.UntypedModuleFunction}]);
    });
  });

  describe("parseAlias", () => {
    it("should return name as identifier when the supplied value does not contain ' as '", () => {
      // arrange

      // act
      let actual = parserImp.parseAlias("foo bar");

      // assert
      expect(actual).to.deep.equal({alias: undefined, name: "foo bar"});
    });

    it("should return name and alias when the supplied value is in the expected format", () => {
      // arrange

      // act
      let actual = parserImp.parseAlias("foo as bar");

      // assert
      expect(actual).to.deep.equal({alias: "bar", name: "foo"});
    });
  });

  describe("parseArguments", () => {
    it("should return an empty list when the code does not contain '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo bar");

      // act
      let actual = parserImp.parseArguments(codeHelper, "foo", true);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return an empty list when the code does not type declaration and isTypedFunction is true", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo bar =");

      // act
      let actual = parserImp.parseArguments(codeHelper, "foo", true);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return arguments list when the code does not have type declaration", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo bar baz =");

      // act
      let actual = parserImp.parseArguments(codeHelper, "foo", false);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });

    it("should return arguments list when the args are destructuring tuple args", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo (bar, baz) =");

      // act
      let actual = parserImp.parseArguments(codeHelper, "foo", false);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });

    it("should return arguments list when the args are destructuring object args", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo {bar, baz} =");

      // act
      let actual = parserImp.parseArguments(codeHelper, "foo", false);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });

    it("should return arguments list when the code does have type declaration", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo -> String -> String -> String\nfoo bar baz =");

      // act
      let actual = parserImp.parseArguments(codeHelper, "foo", true);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });
  });


  describe("parseFunction", () => {
    it("should return empty list when there is no '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo baz");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return the dependency type info when there is an '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = baz");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: 1, typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should not return string in the dependency type info when there is an '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = \"baz\"");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should not return elm keywords in the dependency type info when there is an '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = if then else case of let in type module where import exposing as port");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return multiple dependencies type info", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = baz qux quux");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");
      typeHelper.resolve("qux");
      typeHelper.resolve("quux");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({ occurs: 1, typeInfo: {name: "baz", moduleName: "bar"}});
      expect(actual[1]).to.deep.equal({ occurs: 1, typeInfo: {name: "qux", moduleName: "bar"}});
      expect(actual[2]).to.deep.equal({ occurs: 1, typeInfo: {name: "quux", moduleName: "bar"}});
    });

    it("should return same that occurs twice dependency with occurs '2'", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = baz baz");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");
      typeHelper.resolve("baz");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({ occurs: 2, typeInfo: {name: "baz", moduleName: "bar"}});
    });

    it("should return the dependency type info when there surrounded by square brackets", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = [baz]");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: 1, typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there surrounded by round brackets", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = (baz)");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: 1, typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there surrounded by curly brackets", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = {baz}");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal([{ occurs: 1, typeInfo: {name: "baz", moduleName: "bar"}}]);
    });

    it("should return the dependency type info when there separated by commas", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo = baz,qux,quux");
      let typeHelper = makeElmTypeHelper("bar");
      typeHelper.resolve("baz");
      typeHelper.resolve("qux");
      typeHelper.resolve("quux");

      // act
      let actual = parserImp.parseFunction(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({ occurs: 1, typeInfo: {name: "baz", moduleName: "bar"}});
      expect(actual[1]).to.deep.equal({ occurs: 1, typeInfo: {name: "qux", moduleName: "bar"}});
      expect(actual[2]).to.deep.equal({ occurs: 1, typeInfo: {name: "quux", moduleName: "bar"}});
    });
  });

  describe("parseReturnType", () => {
    it("should return undefined when there is nothing after the function name", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no semicolon after the function name", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo baz");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no semicolon after the function name is repeated on the next line", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo\nfoo");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is a semicolon after the function name and no repeat of function name", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo : baz");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is a semicolon and function name is not at the start of next line", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo : baz foo");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return the return type info when there is a type after the function name with no spaces", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo:baz\nfoo");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal({name: "baz", moduleName: "bar"});
    });

    it("should return the return type info when there is a type after the function name with normal formatting", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("foo : baz\nfoo");
      let typeHelper = makeElmTypeHelper("bar");

      // act
      let actual = parserImp.parseReturnType(codeHelper, typeHelper, "foo", 3);

      // assert
      expect(actual).to.deep.equal({name: "baz", moduleName: "bar"});
    });
  });

  describe("parseType", () => {
    it("should return empty list when there is no '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("type A");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return type when there is an '='", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("type = A");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual).to.deep.equal([{name: "A", moduleName: "foo", parentTypeName: "bar"}]);
    });

    it("should return single type when there is no pipe", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("type = A B");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual).to.deep.equal([{name: "A", moduleName: "foo", parentTypeName: "bar"}]);
    });

    it("should return multiple types when there is '|'", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("type = A | B");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseType(codeHelper, typeHelper, "foo", "bar", 0);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({name: "A", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[1]).to.deep.equal({name: "B", moduleName: "foo", parentTypeName: "bar"});
    });

  });

  describe("parseTypeList", () => {
    it("should return empty list when there is no '('", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("import Foo exposing");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return type list when there is an '('", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("import Foo exposing (bar, baz");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo"});
    });

    it("should return type list when there are no spaces", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("import Foo exposing(bar,baz");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo"});
    });

    it("should return type list containing exposed specific type lists", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("import Foo exposing (bar(baz,qux))");
      let typeHelper = makeElmTypeHelper("foo");

      // act
      let actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[2]).to.deep.equal({name: "qux", moduleName: "foo", parentTypeName: "bar"});
    });

    it("should return all types for list containing exposed type lists containing '..'", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("import Foo exposing (..)");
      let typeHelper = makeElmTypeHelper("foo");
      typeHelper.resolve("bar");
      typeHelper.resolve("baz", "bar", "foo");
      typeHelper.resolve("qux", "bar", "foo");

      // act
      let actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual[0]).to.deep.equal({name: "bar", moduleName: "foo"});
      expect(actual[1]).to.deep.equal({name: "baz", moduleName: "foo", parentTypeName: "bar"});
      expect(actual[2]).to.deep.equal({name: "qux", moduleName: "foo", parentTypeName: "bar"});
    });

    it("should return all types for list containing exposed child type lists containing '..'", () => {
      // arrange
      let codeHelper = makeElmCodeHelper("import Foo exposing (bar(..))");
      let typeHelper = makeElmTypeHelper("foo");
      typeHelper.resolve("baz", "bar", "foo");
      typeHelper.resolve("qux", "bar", "foo");

      // act
      let actual = parserImp.parseTypeList(codeHelper, typeHelper, "foo", 0);

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
      let token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};

      // act
      let actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.code).to.equal("bar");
    });

    it("should return a node with the end from the supplied token", () => {
      // arrange
      let expected = { columnNumber: 123, lineNumber: 456 };
      let token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      token.end = expected;

      // act
      let actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.end).to.equal(expected);
    });

    it("should return a node with the name from the supplied name", () => {
      // arrange
      let expected = { columnNumber: 123, lineNumber: 456 };
      let token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      token.end = expected;

      // act
      let actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.name).to.equal("baz");
    });

    it("should return a node with the type from converting the supplied token type", () => {
      // arrange
      let expected = ElmNodeType.Port;
      let token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      let mockToNodeType = Sinon.mock();
      mockToNodeType.returns(expected);
      parserImp.toNodeType = mockToNodeType;

      // act
      let actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(parserImp.toNodeType).to.have.been.calledWith(ElmTokenType.TypedModuleFunction);
      expect(actual.nodeType).to.equal(expected);
    });

    it("should return a node with start from the supplied token", () => {
      // arrange
      let expected = { columnNumber: 123, lineNumber: 456 };
      let token = <ElmToken> {identifier: "foo", code: "bar", tokenType: ElmTokenType.TypedModuleFunction};
      token.start = expected;

      // act
      let actual = parserImp.toBaseNode(token, "baz");

      // assert
      expect(actual.start).to.equal(expected);
    });
  });

  describe("toNodeType", () => {
    it("should return node type of 'Import' when token type is 'Import'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.Import);

      // assert
      expect(actual).to.equal(ElmNodeType.Import);
    });

    it("should return node type of 'Module' when token type is 'Module'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.Module);

      // assert
      expect(actual).to.equal(ElmNodeType.Module);
    });

    it("should return node type of 'Port' when token type is 'Port'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.Port);

      // assert
      expect(actual).to.equal(ElmNodeType.Port);
    });

    it("should return node type of 'Type' when token type is 'Type'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.Type);

      // assert
      expect(actual).to.equal(ElmNodeType.Type);
    });

    it("should return node type of 'TypeAlias' when token type is 'TypeAlias'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.TypeAlias);

      // assert
      expect(actual).to.equal(ElmNodeType.TypeAlias);
    });

    it("should return node type of 'TypedModuleFunction' when token type is 'TypedModuleFunction'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.TypedModuleFunction);

      // assert
      expect(actual).to.equal(ElmNodeType.TypedModuleFunction);
    });

    it("should return node type of 'UntypedModuleFunction' when token type is 'UntypedModuleFunction'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.UntypedModuleFunction);

      // assert
      expect(actual).to.equal(ElmNodeType.UntypedModuleFunction);
    });

    it("should return node type of 'Unknown' when token type is 'Comment'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.Comment);

      // assert
      expect(actual).to.equal(ElmNodeType.Unknown);
    });

    it("should return node type of 'Unknown' when token type is 'Whitespace'", () => {
      // act
      let actual = parserImp.toNodeType(ElmTokenType.Whitespace);

      // assert
      expect(actual).to.equal(ElmNodeType.Unknown);
    });
  });

  describe("toImportNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      let code = "import Foo";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Import};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an import node for the supplied token", () => {
      // arrange
      let code = "import Foo";
      let exposing = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Import};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", alias: undefined, nodeType: ElmNodeType.Import, exposing});
    });

    it("should return an import node with an alias for the supplied token", () => {
      // arrange
      let code = "import Foo";
      let exposing = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo as Bar", start, end, code, tokenType: ElmTokenType.Import};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", alias: "Bar", nodeType: ElmNodeType.Import, exposing});
    });

    it("should return an import node with exposing list for the supplied token", () => {
      // arrange
      let code = "import Foo exposing (Bar, Baz)";
      let exposing = [{name: "Bar", moduleName: "Foo"}, {name: "Baz", moduleName: "Foo"}];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Import};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toImportNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", alias: undefined, nodeType: ElmNodeType.Import, exposing});
    });
  });

  describe("toModuleNode", () => {
    it("should return an module node for the supplied token", () => {
      // arrange
      let code = "import Foo";
      let exposing = [];
      let children = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Module};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toModuleNode(typeHelper, token, children);

      // assert
      expect(actual).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Module, children, exposing});
    });

    it("should return an module node with the supplied children for the supplied token", () => {
      // arrange
      let code = "import Foo";
      let exposing = [];
      let children = <ElmNode[]>[{name: "qux"}];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Module};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toModuleNode(typeHelper, token, children);

      // assert
      expect(actual).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Module, children, exposing});
    });
  });

  describe("toPortNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      let code = "port foo : () -> msg -> Sub msg";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.Port};

      // act
      let actual = parserImp.toPortNode(token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an port node for the supplied token", () => {
      // arrange
      let code = "port foo : () -> msg -> Sub msg";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.Port};

      // act
      let actual = parserImp.toPortNode(token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.Port});
    });
  });

  describe("toTypeNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      let code = "type Foo";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Type};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toTypeNode(typeHelper, "abc", token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an type node for the supplied token", () => {
      // arrange
      let code = "type Foo";
      let dependencies = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Type};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toTypeNode(typeHelper, "abc", token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Type, dependencies});
    });

    it("should return an type node with dependency list for the supplied token", () => {
      // arrange
      let code = "type Foo = Bar | Baz";
      let dependencies = [{name: "Bar", moduleName: "abc", parentTypeName: "Foo"}, {name: "Baz", moduleName: "abc", parentTypeName: "Foo"}];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.Type};
      let typeHelper = makeElmTypeHelper("abc");

      // act
      let actual = parserImp.toTypeNode(typeHelper, "abc", token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.Type, dependencies});
    });
  });

  describe("toTypeAliasNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      let code = "type alias Foo = { Bar: String }";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.TypeAlias};

      // act
      let actual = parserImp.toTypeAliasNode(token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an typeAlias node for the supplied token", () => {
      // arrange
      let code = "type alias Foo = { Bar: String }";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "Foo", start, end, code, tokenType: ElmTokenType.TypeAlias};

      // act
      let actual = parserImp.toTypeAliasNode(token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "Foo", nodeType: ElmNodeType.TypeAlias});
    });
  });

  describe("toTypedModuleFunctionNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      let code = "foo: Int\nfoo = 123";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      let actual = parserImp.toTypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an untyped module function node for the supplied token when the return type cannot be determined", () => {
      // arrange
      let code = "foo\nfoo = 123";
      let args = [];
      let dependencies = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      let actual = parserImp.toTypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });

    it("should return an typed module function node for the supplied token", () => {
      // arrange
      let code = "foo: Int\nfoo = 123";
      let args = [];
      let dependencies = [];
      let returnType = { name: "Int", moduleName: "Basics"};
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;
      let nodeType = ElmNodeType.TypedModuleFunction;

      // act
      let actual = parserImp.toTypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "foo", returnType, nodeType, arguments: args, dependencies});
    });

    it("should return an typed module function node with arguments from parseArguments", () => {
      // arrange
      let code = "foo: Int\nfoo = bar 123 && baz 456";
      let args = ["qux"];
      let dependencies = [];
      let returnType = { name: "Int", moduleName: "Basics"};
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve("bar");
      typeHelper.resolve("baz");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns(args);
      parserImp.parseArguments = mockParseArguments;
      let nodeType = ElmNodeType.TypedModuleFunction;

      // act
      let actual = parserImp.toTypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", returnType, nodeType, arguments: ["qux"], dependencies});
    });

    it("should return an typed module function node with no dependencies for known references for the supplied token", () => {
      // arrange
      let code = "foo: Int\nfoo = bar 123 && baz 456";
      let args = [];
      let dependencies = [];
      let returnType = { name: "Int", moduleName: "Basics"};
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.TypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve("bar");
      typeHelper.resolve("baz");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;
      let nodeType = ElmNodeType.TypedModuleFunction;

      // act
      let actual = parserImp.toTypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node).to.deep.equal({code, end, start, name: "foo", returnType, nodeType, arguments: args, dependencies});
    });
  });

  describe("toUntypedModuleFunctionNode", () => {
    it("should return a the code helper created by calling makeElmCodeHelper", () => {
      // arrange
      let code = "foo = 123";
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      let actual = parserImp.toUntypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(mockMakeElmCodeHelper.alwaysReturned(actual.codeHelper)).to.be.true;
    });

    it("should return an untyped module function node for the supplied token", () => {
      // arrange
      let code = "foo = 123";
      let args = [];
      let dependencies = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      let actual = parserImp.toUntypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });

    it("should return an untyped module function node with args return from parseArguments", () => {
      // arrange
      let code = "foo = bar 123 && baz 456";
      let args = ["qux"];
      let dependencies = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve("bar");
      typeHelper.resolve("baz");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns(args);
      parserImp.parseArguments = mockParseArguments;

      // act
      let actual = parserImp.toUntypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });

    it("should return an untyped module function node with no dependencies for known references for the supplied token", () => {
      // arrange
      let code = "foo = bar 123 && baz 456";
      let args = [];
      let dependencies = [];
      let start = {columnNumber: 12, lineNumber: 34};
      let end = {columnNumber: 56, lineNumber: 78};
      let token = <ElmToken> {identifier: "foo", start, end, code, tokenType: ElmTokenType.UntypedModuleFunction};
      let typeHelper = makeElmTypeHelper("abc");
      typeHelper.resolve("bar");
      typeHelper.resolve("baz");
      let mockParseArguments = Sinon.stub();
      mockParseArguments.returns([]);
      parserImp.parseArguments = mockParseArguments;

      // act
      let actual = parserImp.toUntypedModuleFunctionNode(typeHelper, token);

      // assert
      expect(actual.node)
        .to.deep.equal({code, end, start, name: "foo", nodeType: ElmNodeType.UntypedModuleFunction, arguments: args, dependencies});
    });
  });
});
