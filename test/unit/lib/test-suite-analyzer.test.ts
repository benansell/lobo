"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {
  ElmCodeInfo,
  ElmCodeLookup, ElmFunctionNode,
  ElmImportNode,
  ElmModuleNode, ElmNode,
  ElmNodeType, ElmTypeInfo,
  ExecutionContext,
  LoboConfig
} from "../../../lib/plugin";
import {
  AnalysisTestSummary, AnalyzedFunctionDependency, AnalyzedTestFunctionNode,
  AnalyzedTestModuleNode,
  createTestSuiteAnalyzer,
  TestSuiteAnalyzer,
  TestSuiteAnalyzerImp
} from "../../../lib/test-suite-analyzer";
import {ElmNodeHelper} from "../../../lib/elm-node-helper";

const expect = chai.expect;
chai.use(SinonChai);

describe("lib test-suite-analyzer", () => {
  const RewiredAnalyzer = rewire("../../../lib/test-suite-analyzer");
  let analyzerImp: TestSuiteAnalyzerImp;
  let mockIsFunctionNode: Sinon.SinonStub;
  let mockIsImportNode: Sinon.SinonStub;
  let mockNodeHelper: ElmNodeHelper;

  beforeEach(() => {
    const rewiredImp = RewiredAnalyzer.__get__("TestSuiteAnalyzerImp");
    mockIsFunctionNode = Sinon.stub();
    mockIsImportNode = Sinon.stub();
    mockNodeHelper = <ElmNodeHelper><{}> {isFunctionNode: mockIsFunctionNode, isImportNode: mockIsImportNode};
    analyzerImp = new rewiredImp(mockNodeHelper);
  });

  describe("createTestSuiteAnalyzer", () => {
    it("should return test suite analyzer", () => {
      // act
      const actual: TestSuiteAnalyzer = createTestSuiteAnalyzer();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("buildAnalyzedModuleNodes", () => {
    it("should ignore object keys that are not own", () => {
      // arrange
      const parentCodeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      const codeLookup = Object.create(parentCodeLookup);
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.findImportNodesForModuleName).not.to.have.been.calledWith("abc", Sinon.match.any);
    });

    it("should call findImportNodesForModuleName with the testFrameworkElmModuleName", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.findImportNodesForModuleName).to.have.been.calledWith("abc", Sinon.match.any);
    });

    it("should call findImportNodesForModuleName with the moduleNode.children", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {children: []}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.findImportNodesForModuleName).to.have.been.calledWith(Sinon.match.any, codeLookup.foo.moduleNode.children);
    });

    it("should call buildAnalyzedFunctionNodes with the codeLookup key value", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.buildAnalyzedFunctionNodes).to.have.been.calledWith("foo", Sinon.match.any, Sinon.match.any);
    });

    it("should call buildAnalyzedFunctionNodes with the moduleNode", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.buildAnalyzedFunctionNodes).to.have.been.calledWith(Sinon.match.any, codeLookup.foo.moduleNode, Sinon.match.any);
    });

    it("should call buildAnalyzedFunctionNodes with the testImportNodes from findImportNodesForModuleName", () => {
      // arrange
      const expected = [{exposing: []}];
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      const mockFindImportNodesForModuleName = Sinon.stub();
      mockFindImportNodesForModuleName.returns(expected);
      analyzerImp.findImportNodesForModuleName = mockFindImportNodesForModuleName;
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.buildAnalyzedFunctionNodes).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected);
    });

    it("should ignore non test modules", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: false, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return test modules without a moduleNode as failed analyzed test modules", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: undefined}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].analyzed).to.equal(false);
      expect(actual[0].codeInfoKey).to.equal("foo");
    });

    it("should return AnalyzedTestModuleNode with analyzed true", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].analyzed).to.deep.equal(true);
    });

    it("should return AnalyzedTestModuleNode with codeInfoKey of the codeLookup key", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].codeInfoKey).to.deep.equal("foo");
    });

    it("should return AnalyzedTestModuleNode with filePath from codeInfo", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}, filePath: "bar"}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].filePath).to.deep.equal("bar");
    });

    it("should return AnalyzedTestModuleNode with moduleNode from codeInfo", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {name: "foo"}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].moduleNode).to.deep.equal(codeLookup.foo.moduleNode);
    });

    it("should return AnalyzedTestModuleNode with tests from buildAnalyzedTestFunctionNodes", () => {
      // arrange
      const expected = [{node: {name: "bar"}}];
      const codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      const mockBuildAnalyzedFunctionNodes = Sinon.stub();
      mockBuildAnalyzedFunctionNodes.returns(expected);
      analyzerImp.buildAnalyzedFunctionNodes = mockBuildAnalyzedFunctionNodes;

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].tests).to.deep.equal(expected);
    });

    it("should return an array of the analyzed test modules", () => {
      // arrange
      const codeLookup = <ElmCodeLookup> {
        bar: <ElmCodeInfo> {isTestFile: true, moduleNode: {}},
        baz: <ElmCodeInfo> {isTestFile: true, moduleNode: {}},
        foo: <ElmCodeInfo> {isTestFile: false, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0].codeInfoKey).to.equal("bar");
      expect(actual[1].codeInfoKey).to.equal("baz");
    });
  });

  describe("buildAnalyzedFunctionNodes", () => {
    it("should call nodeHelper.isFunctionNode with nodes in moduleNode.children", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(mockIsFunctionNode).to.have.been.calledWith(moduleNode.children[0]);
    });

    it("should call isTestFunction with testImportNodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub();
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.findTestTypeOfFunctionNode).to.have.been.calledWith(testImportNodes, Sinon.match.any);
    });

    it("should call isTestFunction with nodes in moduleNode.children", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub();
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.findTestTypeOfFunctionNode).to.have.been.calledWith(Sinon.match.any, moduleNode.children[0]);
    });

    it("should call isTestSuiteFunction with testImportNodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub();
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.findTestSuiteTypeFunctionNode).to.have.been.calledWith(testImportNodes, Sinon.match.any);
    });

    it("should call isTestSuiteFunction with nodes in moduleNode.children", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub();
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.findTestSuiteTypeFunctionNode).to.have.been.calledWith(Sinon.match.any, moduleNode.children[0]);
    });

    it("should call isFunctionExposed for child nodes that are tests with moduleNode.exposing", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type, exposing: []}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub().returns("test");
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isFunctionNodeExposed).to.have.been.calledWith(moduleNode.exposing, Sinon.match.any);
    });

    it("should call isFunctionExposed for child nodes that are tests with child node", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub().returns("test");
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isFunctionNodeExposed).to.have.been.calledWith(Sinon.match.any, moduleNode.children[0]);
    });

    it("should return analyzedTestFunctionNodes with codeInfoModuleKey for test child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      const mockFindTestTypeOfFunctionNode = Sinon.stub();
      mockFindTestTypeOfFunctionNode.withArgs(testImportNodes, children[0]).returns("test");
      mockFindTestTypeOfFunctionNode.returns(undefined);
      analyzerImp.findTestTypeOfFunctionNode = mockFindTestTypeOfFunctionNode;
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].codeInfoModuleKey).to.equal("foo");
    });

    it("should return analyzedTestFunctionNodes with isExposedDirectly from isFunctionNodeExposed for test child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      const mockFindTestTypeOfFunctionNode = Sinon.stub();
      mockFindTestTypeOfFunctionNode.withArgs(testImportNodes, children[0]).returns("test");
      mockFindTestTypeOfFunctionNode.returns(undefined);
      analyzerImp.findTestTypeOfFunctionNode = mockFindTestTypeOfFunctionNode;
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub().returns(true);

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isExposedDirectly).to.equal(true);
    });

    it("should return analyzedTestFunctionNodes with isExposedIndirectly as empty list for test child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      const mockFindTestTypeOfFunctionNode = Sinon.stub();
      mockFindTestTypeOfFunctionNode.withArgs(testImportNodes, children[0]).returns("test");
      mockFindTestTypeOfFunctionNode.returns(undefined);
      analyzerImp.findTestTypeOfFunctionNode = mockFindTestTypeOfFunctionNode;
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isExposedIndirectlyBy).to.deep.equal([]);
    });

    it("should return analyzedTestFunctionNodes with isSuite false for test child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      const mockFindTestTypeOfFunctionNode = Sinon.stub();
      mockFindTestTypeOfFunctionNode.withArgs(testImportNodes, children[0]).returns("test");
      mockFindTestTypeOfFunctionNode.returns(undefined);
      analyzerImp.findTestTypeOfFunctionNode = mockFindTestTypeOfFunctionNode;
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub().returns(undefined);
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].suiteType).to.be.undefined;
    });

    it("should return analyzedTestFunctionNodes with isSuite true for test suite child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub().returns(undefined);
      const mockFindTestSuiteTypeFunctionNode = Sinon.stub();
      mockFindTestSuiteTypeFunctionNode.withArgs(testImportNodes, children[0]).returns("describe");
      mockFindTestSuiteTypeFunctionNode.returns(undefined);
      analyzerImp.findTestSuiteTypeFunctionNode = mockFindTestSuiteTypeFunctionNode;
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].suiteType).to.be.equal("describe");
    });

    it("should return analyzedTestFunctionNodes with isTest false for test suite child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      analyzerImp.findTestTypeOfFunctionNode = Sinon.stub().returns(undefined);
      const mockFindTestSuiteTypeFunctionNode = Sinon.stub();
      mockFindTestSuiteTypeFunctionNode.withArgs(testImportNodes, children[0]).returns("describe");
      mockFindTestSuiteTypeFunctionNode.returns(undefined);
      analyzerImp.findTestSuiteTypeFunctionNode = mockFindTestSuiteTypeFunctionNode;
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].testType).to.be.undefined;
    });

    it("should return analyzedTestFunctionNodes with codeInfoModuleKey for test child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children, name: "qux"};
      mockIsFunctionNode.returns(true);
      const mockFindTestTypeOfFunctionNode = Sinon.stub();
      mockFindTestTypeOfFunctionNode.withArgs(testImportNodes, children[0]).returns("test");
      mockFindTestTypeOfFunctionNode.returns(undefined);
      analyzerImp.findTestTypeOfFunctionNode = mockFindTestTypeOfFunctionNode;
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].moduleName).to.equal(moduleNode.name);
    });

    it("should return analyzedTestFunctionNodes with child node for test child nodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{exposing: []}];
      const children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      const moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      const mockFindTestTypeOfFunctionNode = Sinon.stub();
      mockFindTestTypeOfFunctionNode.withArgs(testImportNodes, children[0]).returns("test");
      mockFindTestTypeOfFunctionNode.returns(undefined);
      analyzerImp.findTestTypeOfFunctionNode = mockFindTestTypeOfFunctionNode;
      analyzerImp.findTestSuiteTypeFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      const actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].node).to.equal(children[0]);
    });
  });

  describe("buildSummary", () => {
    it("should call buildAnalyzedModuleNodes with the context.codeLookup", () => {
      // arrange
      const context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      analyzerImp.buildAnalyzedModuleNodes = Sinon.stub();
      analyzerImp.updateExposedIndirectly = Sinon.stub();
      analyzerImp.toAnalysisTestSummary = Sinon.stub();

      // act
      analyzerImp.buildSummary(context);

      // assert
      expect(analyzerImp.buildAnalyzedModuleNodes).to.have.been.calledWith(context.codeLookup, Sinon.match.any);
    });

    it("should call buildAnalyzedModuleNodes with the testFrameworkElmModuleName", () => {
      // arrange
      const context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      analyzerImp.buildAnalyzedModuleNodes = Sinon.stub();
      analyzerImp.updateExposedIndirectly = Sinon.stub();
      analyzerImp.toAnalysisTestSummary = Sinon.stub();

      // act
      analyzerImp.buildSummary(context);

      // assert
      expect(analyzerImp.buildAnalyzedModuleNodes).to.have.been.calledWith(Sinon.match.any, "bar");
    });

    it("should call updateExposedIndirectly with the results from buildAnalyzedModuleNodes", () => {
      // arrange
      const context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      const expected = [{name: "qux"}];
      analyzerImp.buildAnalyzedModuleNodes = Sinon.stub().returns(expected);
      analyzerImp.updateExposedIndirectly = Sinon.stub();
      analyzerImp.toAnalysisTestSummary = Sinon.stub();

      // act
      analyzerImp.buildSummary(context);

      // assert
      expect(analyzerImp.updateExposedIndirectly).to.have.been.calledWith(expected);
    });

    it("should call toAnalysisTestSummary with the results from buildAnalyzedModuleNodes", () => {
      // arrange
      const context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      const expected = [{name: "qux"}];
      analyzerImp.buildAnalyzedModuleNodes = Sinon.stub().returns(expected);
      analyzerImp.updateExposedIndirectly = Sinon.stub();
      analyzerImp.toAnalysisTestSummary = Sinon.stub();

      // act
      analyzerImp.buildSummary(context);

      // assert
      expect(analyzerImp.toAnalysisTestSummary).to.have.been.calledWith(expected);
    });

    it("should return the output from toAnalysisTestSummary", () => {
      // arrange
      const context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      const expected = [{name: "qux"}];
      analyzerImp.buildAnalyzedModuleNodes = Sinon.stub();
      analyzerImp.updateExposedIndirectly = Sinon.stub();
      analyzerImp.toAnalysisTestSummary = Sinon.stub().returns(expected);

      // act
      const actual = analyzerImp.buildSummary(context);

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("findAnalyzedFunctionNodInModulesForDependency", () => {
    it("should return undefined when none of the module nodes match the dependency module node", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo"};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub();

      // act
      const actual = analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should call findAnalysedFunctionNodeForDependency with moduleNode.tests", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub();

      // act
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeForDependency).to.have.been.calledWith(nodes[0].tests, Sinon.match.any);
    });

    it("should call findAnalysedFunctionNodeForDependency with dependency", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub();

      // act
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeForDependency).to.have.been.calledWith(Sinon.match.any, dependency);
    });

    it("should return AnalyzedFunctionDependency containing moduleNode for function node", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      const expected = <AnalyzedTestFunctionNode> {};
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub().returns(expected);

      // act
      const actual = analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(actual.moduleNode).to.equal(nodes[0]);
    });

    it("should return AnalyzedFunctionDependency containing function node returned by findAnalyzedFunctionNodeForDependency", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      const expected = <AnalyzedTestFunctionNode> {};
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub().returns(expected);

      // act
      const actual = analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(actual.functionNode).to.equal(expected);
    });
  });

  describe("findAnalyzedFunctionNodeForDependency", () => {
    it("should return undefined when there are no function nodes", () => {
      // arrange
      const dependency = <ElmTypeInfo> {};

      // act
      const actual = analyzerImp.findAnalyzedFunctionNodeForDependency([], dependency);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when none of the function nodes are for dependency", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo"};
      const nodes = <AnalyzedTestFunctionNode[]> [{node: {name: "bar"}}, {node: {name: "baz"}}];

      // act
      const actual = analyzerImp.findAnalyzedFunctionNodeForDependency(nodes, dependency);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return AnalyzedTestFunctionNode from function nodes for dependency", () => {
      // arrange
      const dependency = <ElmTypeInfo> {name: "foo"};
      const functionNodes = <AnalyzedTestFunctionNode[]> [{node: {name: "foo"}}, {node: {name: "baz"}}];

      // act
      const actual = analyzerImp.findAnalyzedFunctionNodeForDependency(functionNodes, dependency);

      // assert
      expect(actual).to.equal(functionNodes[0]);
    });
  });

  describe("findImportNodesForModuleName", () => {
    it("should return empty array when there are no import nodes", () => {
      // act
      const actual = analyzerImp.findImportNodesForModuleName("foo", []);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should ignore non-import nodes for modules that are not the supplied module name", () => {
      // arrange
      const nodes = <ElmNode[]> [{name: "bar"}, {name: "baz"}, {name: "qux"}];
      mockIsImportNode.returns(false);

      // act
      const actual = analyzerImp.findImportNodesForModuleName("foo", nodes);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should ignore import nodes for modules that are not the supplied module name", () => {
      // arrange
      const nodes = <ElmNode[]> [{name: "bar"}, {name: "baz"}, {name: "qux"}];
      mockIsImportNode.returns(true);

      // act
      const actual = analyzerImp.findImportNodesForModuleName("foo", nodes);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return all import nodes for supplied module name", () => {
      // arrange
      const nodes = <ElmNode[]> [{name: "bar"}, {name: "foo"}, {name: "baz"}, {name: "foo"}];
      mockIsImportNode.returns(true);

      // act
      const actual = analyzerImp.findImportNodesForModuleName("foo", nodes);

      // assert
      expect(actual).to.deep.equal([nodes[1], nodes[3]]);
    });
  });

  describe("findTestTypeOfFunctionNode", () => {
    it("should return undefined when node is not a test function node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "expect"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when node dependencies are for test modules not in testImportNodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "bar", name: "expect"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return 'test' when node is not a test node with arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: ["baz"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "test"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("test");
    });

    it("should return 'fuzz' when node is not a fuzz test node with arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: ["baz"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzz");
    });

    it("should return 'fuzz' when node is not a fuzz test node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzz");
    });

    it("should return 'fuzz2' when node is not a fuzz2 test node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz2"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzz2");
    });

    it("should return 'fuz3' when node is not a fuzz3 test node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz3"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzz3");
    });

    it("should return 'fuzz4' when node is not a fuzz4 test node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz4"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzz4");
    });

    it("should return 'fuzz5' when node is not a fuzz5 test node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz5"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzz5");
    });

    it("should return 'fuzzWith' when node is not a fuzzWith test node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzzWith"}}]};

      // act
      const actual = analyzerImp.findTestTypeOfFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("fuzzWith");
    });
  });

  describe("findTestSuiteTypeFunctionNode", () => {
    it("should return undefined when node is not a test function node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "expect"}}]};

      // act
      const actual = analyzerImp.findTestSuiteTypeFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when node dependencies are for test modules not in testImportNodes", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "bar", name: "expect"}}]};

      // act
      const actual = analyzerImp.findTestSuiteTypeFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return 'describe' when node is not a describe node", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: ["bar"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "describe"}}]};

      // act
      const actual = analyzerImp.findTestSuiteTypeFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("describe");
    });

    it("should return 'describe' when node is not a describe node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "describe"}}]};

      // act
      const actual = analyzerImp.findTestSuiteTypeFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("describe");
    });

    it("should return 'concat' when node is not a concat node with arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: ["bar"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "concat"}}]};

      // act
      const actual = analyzerImp.findTestSuiteTypeFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("concat");
    });

    it("should return 'concat' when node is not a concat node with no arguments", () => {
      // arrange
      const testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      const node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "concat"}}]};

      // act
      const actual = analyzerImp.findTestSuiteTypeFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.equal("concat");
    });
  });

  describe("isFunctionNdeExposed", () => {
    it("should return false when function node is not in the exposing list", () => {
      // arrange
      const exposing = <ElmTypeInfo[]> [{name: "foo"}, {name: "bar"}];
      const node = <ElmFunctionNode> {name: "baz"};

      // act
      const actual = analyzerImp.isFunctionNodeExposed(exposing, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when function node is not in the exposing list", () => {
      // arrange
      const exposing = <ElmTypeInfo[]> [{name: "foo"}, {name: "bar"}];
      const node = <ElmFunctionNode> {name: "bar"};

      // act
      const actual = analyzerImp.isFunctionNodeExposed(exposing, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isHidden", () => {
    it("should be false when function node has arguments", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [], node: {arguments: ["foo"]}};

      // act
      const actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the functionNode is directly exposed and has no arguments", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: true, node: {arguments: []}};

      // act
      const actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the functionNode is not directly exposed, is indirectly exposed and has no arguments", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [{}], node: {arguments: []}};

      // act
      const actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the functionNode is not directly exposed,is not indirectly exposed and has no arguments", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [], node: {arguments: []}};

      // act
      const actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isOverExposed", () => {
    it("should be false when function node has arguments", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [], node: {arguments: ["foo"]}};

      // act
      const actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when function node no arguments and is not directly or indirectly exposed", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [], node: {arguments: []}};

      // act
      const actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when function node no arguments and is directly exposed but not indirectly exposed", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: true, isExposedIndirectlyBy: [], node: {arguments: []}};

      // act
      const actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when function node no arguments and is not directly exposed but is indirectly exposed once", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [{occurs: [1]}], node: {arguments: []}};

      // act
      const actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be true when function node no arguments and is directly exposed and indirectly exposed once", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: true, isExposedIndirectlyBy: [{occurs: [1]}], node: {arguments: []}};

      // act
      const actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.true;
    });

    it("should be true when function node no arguments and is not directly exposed and indirectly exposed more than once", () => {
      // arrange
      const node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [{occurs: [1, 2]}], node: {arguments: []}};

      // act
      const actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("toAnalysisSummary", () => {
    it("should return empty summary when there are no analyzed module nodes", () => {
      // arrange
      const expected = <AnalysisTestSummary> {
        analysisFailureCount: 0,
        analysisFailures: [],
        hiddenTestCount: 0,
        hiddenTests: [],
        overExposedTestCount: 0,
        overExposedTests: []
      };

      // act
      const actual = analyzerImp.toAnalysisTestSummary([]);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should return summary with count of analysis failures", () => {
      // arrange
      const moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests: []},
        <AnalyzedTestModuleNode> {analyzed: false}
      ];

      // act
      const actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.analysisFailureCount).to.equal(2);
    });

    it("should return summary with array of analysis failure codeInfoKeys", () => {
      // arrange
      const moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false, codeInfoKey: "foo"},
        <AnalyzedTestModuleNode> {analyzed: true, codeInfoKey: "bar", tests: []},
        <AnalyzedTestModuleNode> {analyzed: false, codeInfoKey: "baz"}
      ];

      // act
      const actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.analysisFailures).to.deep.equal(["foo", "baz"]);
    });

    it("should return summary with count of hidden tests", () => {
      // arrange
      const moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests: [{node: {name: "foo"}}, {node: {name: "bar"}}]}
      ];
      const mockIsHidden = Sinon.stub();
      mockIsHidden.returns(true);
      analyzerImp.isHidden = mockIsHidden;
      analyzerImp.isOverExposed = Sinon.stub();

      // act
      const actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.hiddenTestCount).to.equal(2);
    });

    it("should return summary with array of hidden tests", () => {
      // arrange
      const tests = [{node: {name: "foo"}}, {node: {name: "bar"}}, {node: {name: "baz"}}];
      const moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests}
      ];
      const mockIsHidden = Sinon.stub();
      mockIsHidden.withArgs(tests[1]).returns(true);
      mockIsHidden.returns(false);
      analyzerImp.isHidden = mockIsHidden;
      analyzerImp.isOverExposed = Sinon.stub();

      // act
      const actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.hiddenTests).to.deep.equal([tests[1]]);
    });

    it("should return summary with count of overExposed tests", () => {
      // arrange
      const moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests: [{node: {name: "foo"}}, {node: {name: "bar"}}]}
      ];
      const mockIsOverExposed = Sinon.stub();
      mockIsOverExposed.returns(true);
      analyzerImp.isOverExposed = mockIsOverExposed;
      analyzerImp.isHidden = Sinon.stub();

      // act
      const actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.overExposedTestCount).to.equal(2);
    });

    it("should return summary with array of overExposed tests", () => {
      // arrange
      const tests = [{node: {name: "foo"}}, {node: {name: "bar"}}, {node: {name: "baz"}}];
      const moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests}
      ];
      const mockIsOverExposed = Sinon.stub();
      mockIsOverExposed.withArgs(tests[1]).returns(true);
      mockIsOverExposed.returns(false);
      analyzerImp.isOverExposed = mockIsOverExposed;
      analyzerImp.isHidden = Sinon.stub();

      // act
      const actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.overExposedTests).to.deep.equal([tests[1]]);
    });
  });

  describe("updateExposedIndirectly", () => {
    it("should call updateExposedIndirectlyFonFunctionNode with all the module nodes", () => {
      // arrange
      const nodes = <AnalyzedTestModuleNode[]> [
        {moduleNode: {name: "foo"}, tests: [{}]},
        {moduleNode: {name: "foo"}, tests: []}
      ];
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.stub();

      // act
      analyzerImp.updateExposedIndirectly(nodes);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledWith(nodes, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateExposedIndirectlyFonFunctionNode with the module node for the test", () => {
      // arrange
      const nodes = <AnalyzedTestModuleNode[]> [
        {moduleNode: {name: "foo"}, tests: [{}]},
        {moduleNode: {name: "foo"}, tests: []}
      ];
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.stub();

      // act
      analyzerImp.updateExposedIndirectly(nodes);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledWith(Sinon.match.any, nodes[0], nodes[0].tests[0]);
    });
  });

  describe("updateExposedIndirectlyForFunctionNode", () => {
    it("should call findAnalyzedFunctionNodeInModulesForDependency with all the module nodes for node.dependencies", () => {
      // arrange
      const typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      const test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "foo"}, tests: [test]}];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub();

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeInModulesForDependency).to.have.been.calledWith(nodes, Sinon.match.any);
    });

    it("should call findAnalyzedFunctionNodeInModulesForDependency with dependency typeInfo for node.dependencies", () => {
      // arrange
      const typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      const test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "foo"}, tests: [test]}];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub();

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeInModulesForDependency).to.have.been.calledWith(Sinon.match.any, typeInfo);
    });

    it("should ignore node.dependencies that cannot be determined", () => {
      // arrange
      const typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      const test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      const nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "foo"}, tests: [test]}];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub().returns(undefined);
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.spy(analyzerImp.updateExposedIndirectlyForFunctionNode);

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledOnce;
    });

    it("should ignore node.dependencies that have already been added", () => {
      // arrange
      const typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      const test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      const moduleNode = <AnalyzedTestModuleNode> {codeInfoKey: "foo", moduleNode: {}, tests: [test]};
      const dependencyFunctionNode = {isExposedIndirectlyBy: [{codeInfoKey: "foo", functionNode: test, occurs: [1]}]};
      const dependency = <AnalyzedFunctionDependency> {functionNode: dependencyFunctionNode, moduleNode};
      const nodes = <AnalyzedTestModuleNode[]> [moduleNode];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub().returns(dependency);
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.spy(analyzerImp.updateExposedIndirectlyForFunctionNode);

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledOnce;
    });

    it("should recursively call self for node.dependencies that have already not been added", () => {
      // arrange
      const typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      const test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      const moduleNode = <AnalyzedTestModuleNode> {codeInfoKey: "foo", moduleNode: {}, tests: [test]};
      const dependencyFunctionNode = <AnalyzedTestFunctionNode> {isExposedIndirectlyBy: [], node: {dependencies: []}};
      const dependency = <AnalyzedFunctionDependency> {functionNode: dependencyFunctionNode, moduleNode};
      const nodes = <AnalyzedTestModuleNode[]> [moduleNode];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub().returns(dependency);
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.spy(analyzerImp.updateExposedIndirectlyForFunctionNode);

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledTwice;
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode)
        .to.have.been.calledWith(nodes, dependency.moduleNode, dependency.functionNode);
    });
  });
});
