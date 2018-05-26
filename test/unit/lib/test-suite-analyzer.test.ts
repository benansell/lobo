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

let expect = chai.expect;
chai.use(SinonChai);

describe("lib test-suite-analyzer", () => {
  let RewiredAnalyzer = rewire("../../../lib/test-suite-analyzer");
  let analyzerImp: TestSuiteAnalyzerImp;
  let mockIsFunctionNode: Sinon.SinonStub;
  let mockIsImportNode: Sinon.SinonStub;
  let mockNodeHelper: ElmNodeHelper;

  beforeEach(() => {
    let rewiredImp = RewiredAnalyzer.__get__("TestSuiteAnalyzerImp");
    mockIsFunctionNode = Sinon.stub();
    mockIsImportNode = Sinon.stub();
    mockNodeHelper = <ElmNodeHelper><{}> {isFunctionNode: mockIsFunctionNode, isImportNode: mockIsImportNode};
    analyzerImp = new rewiredImp(mockNodeHelper);
  });

  describe("createTestSuiteAnalyzer", () => {
    it("should return test suite analyzer", () => {
      // act
      let actual: TestSuiteAnalyzer = createTestSuiteAnalyzer();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("buildAnalyzedModuleNodes", () => {
    it("should ignore object keys that are not own", () => {
      // arrange
      let parentCodeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      let codeLookup = Object.create(parentCodeLookup);
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.findImportNodesForModuleName).not.to.have.been.calledWith("abc", Sinon.match.any);
    });

    it("should call findImportNodesForModuleName with the testFrameworkElmModuleName", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
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
      let codeLookup = <ElmCodeLookup> {
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
      let codeLookup = <ElmCodeLookup> {
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
      let codeLookup = <ElmCodeLookup> {
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
      let expected = [{exposing: []}];
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      const mockfindImportNodesForModuleName = Sinon.stub();
      mockfindImportNodesForModuleName.returns(expected);
      analyzerImp.findImportNodesForModuleName = mockfindImportNodesForModuleName;
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(analyzerImp.buildAnalyzedFunctionNodes).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected);
    });

    it("should ignore non test modules", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: false, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return test modules without a moduleNode as failed analyzed test modules", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: undefined}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].analyzed).to.equal(false);
      expect(actual[0].codeInfoKey).to.equal("foo");
    });

    it("should return AnalyzedTestModuleNode with analyzed true", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].analyzed).to.deep.equal(true);
    });

    it("should return AnalyzedTestModuleNode with codeInfoKey of the codeLookup key", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].codeInfoKey).to.deep.equal("foo");
    });

    it("should return AnalyzedTestModuleNode with filePath from codeInfo", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}, filePath: "bar"}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].filePath).to.deep.equal("bar");
    });

    it("should return AnalyzedTestModuleNode with isMainTestFile from codeInfo", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}, isMainTestFile: true}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].isMainTestFile).to.deep.equal(true);
    });

    it("should return AnalyzedTestModuleNode with moduleNode from codeInfo", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {name: "foo"}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].moduleNode).to.deep.equal(codeLookup.foo.moduleNode);
    });

    it("should return AnalyzedTestModuleNode with tests from buildAnalyzedTestFunctionNodes", () => {
      // arrange
      let expected = [{node: {name: "bar"}}];
      let codeLookup = <ElmCodeLookup> {
        foo: <ElmCodeInfo> {isTestFile: true, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      const mockBuildAnalyzedFunctionNodes = Sinon.stub();
      mockBuildAnalyzedFunctionNodes.returns(expected);
      analyzerImp.buildAnalyzedFunctionNodes = mockBuildAnalyzedFunctionNodes;

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual[0].tests).to.deep.equal(expected);
    });

    it("should return an array of the analyzed test modules", () => {
      // arrange
      let codeLookup = <ElmCodeLookup> {
        bar: <ElmCodeInfo> {isTestFile: true, moduleNode: {}},
        baz: <ElmCodeInfo> {isTestFile: true, moduleNode: {}},
        foo: <ElmCodeInfo> {isTestFile: false, moduleNode: {}}
      };
      analyzerImp.findImportNodesForModuleName = Sinon.stub();
      analyzerImp.buildAnalyzedFunctionNodes = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedModuleNodes(codeLookup, "abc");

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0].codeInfoKey).to.equal("bar");
      expect(actual[1].codeInfoKey).to.equal("baz");
    });
  });

  describe("buildAnalyzedFunctionNodes", () => {
    it("should call nodeHelper.isFunctionNode with nodes in moduleNode.children", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(mockIsFunctionNode).to.have.been.calledWith(moduleNode.children[0]);
    });

    it("should call isTestFunction with testImportNodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub();
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isTestFunctionNode).to.have.been.calledWith(testImportNodes, Sinon.match.any);
    });

    it("should call isTestFunction with nodes in moduleNode.children", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub();
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isTestFunctionNode).to.have.been.calledWith(Sinon.match.any, moduleNode.children[0]);
    });

    it("should call isTestSuiteFunction with testImportNodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub();
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isTestSuiteFunctionNode).to.have.been.calledWith(testImportNodes, Sinon.match.any);
    });

    it("should call isTestSuiteFunction with nodes in moduleNode.children", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub();
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isTestSuiteFunctionNode).to.have.been.calledWith(Sinon.match.any, moduleNode.children[0]);
    });

    it("should call isFunctionExposed for child nodes that are tests with moduleNode.exposing", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type, exposing: []}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub().returns(true);
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isFunctionNodeExposed).to.have.been.calledWith(moduleNode.exposing, Sinon.match.any);
    });

    it("should call isFunctionExposed for child nodes that are tests with child node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let moduleNode = <ElmModuleNode> {children: [{name: "bar", nodeType: ElmNodeType.Type}]};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub().returns(true);
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(analyzerImp.isFunctionNodeExposed).to.have.been.calledWith(Sinon.match.any, moduleNode.children[0]);
    });

    it("should return analyzedTestFunctionNodes with codeInfoModuleKey for test child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestFunctionNode.returns(false);
      analyzerImp.isTestFunctionNode = mockIsTestFunctionNode;
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].codeInfoModuleKey).to.equal("foo");
    });

    it("should return analyzedTestFunctionNodes with isExposedDirectly from isFunctionNodeExposed for test child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestFunctionNode.returns(false);
      analyzerImp.isTestFunctionNode = mockIsTestFunctionNode;
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub().returns(true);

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isExposedDirectly).to.equal(true);
    });

    it("should return analyzedTestFunctionNodes with isExposedIndirectly as empty list for test child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestFunctionNode.returns(false);
      analyzerImp.isTestFunctionNode = mockIsTestFunctionNode;
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isExposedIndirectlyBy).to.deep.equal([]);
    });

    it("should return analyzedTestFunctionNodes with isSuite false for test child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestFunctionNode.returns(false);
      analyzerImp.isTestFunctionNode = mockIsTestFunctionNode;
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub().returns(false);
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isSuite).to.be.false;
    });

    it("should return analyzedTestFunctionNodes with isSuite true for test suite child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub().returns(false);
      let mockIsTestSuiteFunctionNode = Sinon.stub();
      mockIsTestSuiteFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestSuiteFunctionNode.returns(false);
      analyzerImp.isTestSuiteFunctionNode = mockIsTestSuiteFunctionNode;
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isSuite).to.be.true;
    });

    it("should return analyzedTestFunctionNodes with isTest false for test suite child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      analyzerImp.isTestFunctionNode = Sinon.stub().returns(false);
      let mockIsTestSuiteFunctionNode = Sinon.stub();
      mockIsTestSuiteFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestSuiteFunctionNode.returns(false);
      analyzerImp.isTestSuiteFunctionNode = mockIsTestSuiteFunctionNode;
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].isTest).to.be.false;
    });

    it("should return analyzedTestFunctionNodes with codeInfoModuleKey for test child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children, name: "qux"};
      mockIsFunctionNode.returns(true);
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestFunctionNode.returns(false);
      analyzerImp.isTestFunctionNode = mockIsTestFunctionNode;
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].moduleName).to.equal(moduleNode.name);
    });

    it("should return analyzedTestFunctionNodes with child node for test child nodes", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{exposing: []}];
      let children = [{name: "bar", nodeType: ElmNodeType.TypedModuleFunction}, {name: "baz", nodeType: ElmNodeType.Type}];
      let moduleNode = <ElmModuleNode> {children};
      mockIsFunctionNode.returns(true);
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(testImportNodes, children[0]).returns(true);
      mockIsTestFunctionNode.returns(false);
      analyzerImp.isTestFunctionNode = mockIsTestFunctionNode;
      analyzerImp.isTestSuiteFunctionNode = Sinon.stub();
      analyzerImp.isFunctionNodeExposed = Sinon.stub();

      // act
      let actual = analyzerImp.buildAnalyzedFunctionNodes("foo", moduleNode, testImportNodes);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0].node).to.equal(children[0]);
    });
  });

  describe("buildSummary", () => {
    it("should call buildAnalyzedModuleNodes with the context.codeLookup", () => {
      // arrange
      let context = <ExecutionContext> {};
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
      let context = <ExecutionContext> {};
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
      let context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      let expected = [{name: "qux"}];
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
      let context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      let expected = [{name: "qux"}];
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
      let context = <ExecutionContext> {};
      context.codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {}};
      context.config = <LoboConfig><{}> {testFramework: {testFrameworkElmModuleName: () => "bar"}};
      let expected = [{name: "qux"}];
      analyzerImp.buildAnalyzedModuleNodes = Sinon.stub();
      analyzerImp.updateExposedIndirectly = Sinon.stub();
      analyzerImp.toAnalysisTestSummary = Sinon.stub().returns(expected);

      // act
      let actual = analyzerImp.buildSummary(context);

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("findAnalyzedFunctionNodInModulesForDependency", () => {
    it("should return undefined when none of the module nodes match the dependency module node", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo"};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub();

      // act
      let actual = analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should call findAnalysedFunctionNodeForDependency with moduleNode.tests", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub();

      // act
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeForDependency).to.have.been.calledWith(nodes[0].tests, Sinon.match.any);
    });

    it("should call findAnalysedFunctionNodeForDependency with dependency", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub();

      // act
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeForDependency).to.have.been.calledWith(Sinon.match.any, dependency);
    });

    it("should return AnalyzedFunctionDependency containing moduleNode for function node", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      let expected = <AnalyzedTestFunctionNode> {};
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub().returns(expected);

      // act
      let actual = analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(actual.moduleNode).to.equal(nodes[0]);
    });

    it("should return AnalyzedFunctionDependency containing function node returned by findAnalyzedFunctionNodeForDependency", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo", moduleName: "bar"};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "bar"}, tests: []}];
      let expected = <AnalyzedTestFunctionNode> {};
      analyzerImp.findAnalyzedFunctionNodeForDependency = Sinon.stub().returns(expected);

      // act
      let actual = analyzerImp.findAnalyzedFunctionNodeInModulesForDependency(nodes, dependency);

      // assert
      expect(actual.functionNode).to.equal(expected);
    });
  });

  describe("findAnalyzedFunctionNodeForDependency", () => {
    it("should return undefined when there are no function nodes", () => {
      // arrange
      let dependency = <ElmTypeInfo> {};

      // act
      let actual = analyzerImp.findAnalyzedFunctionNodeForDependency([], dependency);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when none of the function nodes are for dependency", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo"};
      let nodes = <AnalyzedTestFunctionNode[]> [{node: {name: "bar"}}, {node: {name: "baz"}}];

      // act
      let actual = analyzerImp.findAnalyzedFunctionNodeForDependency(nodes, dependency);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return AnalyzedTestFunctionNode from function nodes for dependency", () => {
      // arrange
      let dependency = <ElmTypeInfo> {name: "foo"};
      let functionNodes = <AnalyzedTestFunctionNode[]> [{node: {name: "foo"}}, {node: {name: "baz"}}];

      // act
      let actual = analyzerImp.findAnalyzedFunctionNodeForDependency(functionNodes, dependency);

      // assert
      expect(actual).to.equal(functionNodes[0]);
    });
  });

  describe("findImportNodesForModuleName", () => {
    it("should return empty array when there are no import nodes", () => {
      // act
      let actual = analyzerImp.findImportNodesForModuleName("foo", []);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should ignore non-import nodes for modules that are not the supplied module name", () => {
      // arrange
      let nodes = <ElmNode[]> [{name: "bar"}, {name: "baz"}, {name: "qux"}];
      mockIsImportNode.returns(false);

      // act
      let actual = analyzerImp.findImportNodesForModuleName("foo", nodes);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should ignore import nodes for modules that are not the supplied module name", () => {
      // arrange
      let nodes = <ElmNode[]> [{name: "bar"}, {name: "baz"}, {name: "qux"}];
      mockIsImportNode.returns(true);

      // act
      let actual = analyzerImp.findImportNodesForModuleName("foo", nodes);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return all import nodes for supplied module name", () => {
      // arrange
      let nodes = <ElmNode[]> [{name: "bar"}, {name: "foo"}, {name: "baz"}, {name: "foo"}];
      mockIsImportNode.returns(true);

      // act
      let actual = analyzerImp.findImportNodesForModuleName("foo", nodes);

      // assert
      expect(actual).to.deep.equal([nodes[1], nodes[3]]);
    });
  });

  describe("isFunctionNdeExposed", () => {
    it("should return false when function node is not in the exposing list", () => {
      // arrange
      let exposing = <ElmTypeInfo[]> [{name: "foo"}, {name: "bar"}];
      let node = <ElmFunctionNode> {name: "baz"};

      // act
      let actual = analyzerImp.isFunctionNodeExposed(exposing, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when function node is not in the exposing list", () => {
      // arrange
      let exposing = <ElmTypeInfo[]> [{name: "foo"}, {name: "bar"}];
      let node = <ElmFunctionNode> {name: "bar"};

      // act
      let actual = analyzerImp.isFunctionNodeExposed(exposing, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isHidden", () => {
    it("should return false when the functionNode is directly exposed", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: true};

      // act
      let actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the functionNode is not directly exposed and is indirectly exposed", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [{}]};

      // act
      let actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the functionNode is not directly exposed and is not indirectly exposed", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: []};

      // act
      let actual = analyzerImp.isHidden(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isOverExposed", () => {
    it("should be false when function node has arguments", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [], node: {arguments: ["foo"]}};

      // act
      let actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when function node no arguments and is not directly or indirectly exposed", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [], node: {arguments: []}};

      // act
      let actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when function node no arguments and is directly exposed but not indirectly exposed", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: true, isExposedIndirectlyBy: [], node: {arguments: []}};

      // act
      let actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be false when function node no arguments and is not directly exposed but is indirectly exposed once", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [{occurs: [1]}], node: {arguments: []}};

      // act
      let actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should be true when function node no arguments and is directly exposed and indirectly exposed once", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: true, isExposedIndirectlyBy: [{occurs: [1]}], node: {arguments: []}};

      // act
      let actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.true;
    });

    it("should be true when function node no arguments and is not directly exposed and indirectly exposed more than once", () => {
      // arrange
      let node = <AnalyzedTestFunctionNode> {isExposedDirectly: false, isExposedIndirectlyBy: [{occurs: [1, 2]}], node: {arguments: []}};

      // act
      let actual = analyzerImp.isOverExposed(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isTestFunctionNode", () => {
    it("should return false when node is not a test function node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "expect"}}]};

      // act
      let actual = analyzerImp.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a test node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["baz"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "test"}}]};

      // act
      let actual = analyzerImp.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "test"}}]};

      // act
      let actual = analyzerImp.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz test node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["baz"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz"}}]};

      // act
      let actual = analyzerImp.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz"}}]};

      // act
      let actual = analyzerImp.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isTestSuiteFunctionNode", () => {
    it("should return false when node is not a test function node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "expect"}}]};

      // act
      let actual = analyzerImp.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a describe node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["bar"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "describe"}}]};

      // act
      let actual = analyzerImp.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a describe node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "describe"}}]};

      // act
      let actual = analyzerImp.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a concat node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["bar"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "concat"}}]};

      // act
      let actual = analyzerImp.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a concat node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "concat"}}]};

      // act
      let actual = analyzerImp.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("toAnalysisSummary", () => {
    it("should return empty summary when there are no analyzed module nodes", () => {
      // arrange
      let expected = <AnalysisTestSummary> {
        analysisFailureCount: 0,
        analysisFailures: [],
        hiddenTestCount: 0,
        hiddenTests: [],
        overExposedTestCount: 0,
        overExposedTests: [],
        testCount: 0
      };

      // act
      let actual = analyzerImp.toAnalysisTestSummary([]);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should return summary with count of analysis failures", () => {
      // arrange
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests: []},
        <AnalyzedTestModuleNode> {analyzed: false}
      ];

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.analysisFailureCount).to.equal(2);
    });

    it("should return summary with array of analysis failure codeInfoKeys", () => {
      // arrange
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false, codeInfoKey: "foo"},
        <AnalyzedTestModuleNode> {analyzed: true, codeInfoKey: "bar", tests: []},
        <AnalyzedTestModuleNode> {analyzed: false, codeInfoKey: "baz"}
      ];

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.analysisFailures).to.deep.equal(["foo", "baz"]);
    });

    it("should return summary with count of tests", () => {
      // arrange
      let tests = [{node: {name: "foo"}}, {node: {name: "bar"}}, {node: {name: "baz"}}];
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests}
      ];
      analyzerImp.isHidden = Sinon.stub();
      analyzerImp.isOverExposed = Sinon.stub();

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.testCount).to.equal(3);
    });

    it("should return summary with count of hidden tests", () => {
      // arrange
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests: [{node: {name: "foo"}}, {node: {name: "bar"}}]}
      ];
      let mockIsHidden = Sinon.stub();
      mockIsHidden.returns(true);
      analyzerImp.isHidden = mockIsHidden;
      analyzerImp.isOverExposed = Sinon.stub();

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.hiddenTestCount).to.equal(2);
    });

    it("should return summary with array of hidden tests", () => {
      // arrange
      let tests = [{node: {name: "foo"}}, {node: {name: "bar"}}, {node: {name: "baz"}}];
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests}
      ];
      let mockIsHidden = Sinon.stub();
      mockIsHidden.withArgs(tests[1]).returns(true);
      mockIsHidden.returns(false);
      analyzerImp.isHidden = mockIsHidden;
      analyzerImp.isOverExposed = Sinon.stub();

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.hiddenTests).to.deep.equal([tests[1]]);
    });

    it("should return summary with count of overExposed tests", () => {
      // arrange
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests: [{node: {name: "foo"}}, {node: {name: "bar"}}]}
      ];
      let mockIsOverExposed = Sinon.stub();
      mockIsOverExposed.returns(true);
      analyzerImp.isOverExposed = mockIsOverExposed;
      analyzerImp.isHidden = Sinon.stub();

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.overExposedTestCount).to.equal(2);
    });

    it("should return summary with array of overExposed tests", () => {
      // arrange
      let tests = [{node: {name: "foo"}}, {node: {name: "bar"}}, {node: {name: "baz"}}];
      let moduleNodes = [
        <AnalyzedTestModuleNode> {analyzed: false},
        <AnalyzedTestModuleNode> {analyzed: true, tests}
      ];
      let mockIsOverExposed = Sinon.stub();
      mockIsOverExposed.withArgs(tests[1]).returns(true);
      mockIsOverExposed.returns(false);
      analyzerImp.isOverExposed = mockIsOverExposed;
      analyzerImp.isHidden = Sinon.stub();

      // act
      let actual = analyzerImp.toAnalysisTestSummary(moduleNodes);

      // assert
      expect(actual.overExposedTests).to.deep.equal([tests[1]]);
    });
  });

  describe("updateExposedIndirectly", () => {
    it("should call updateExposedIndirectlyFonFunctionNode with all the module nodes", () => {
      // arrange
      let nodes = <AnalyzedTestModuleNode[]> [
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
      let nodes = <AnalyzedTestModuleNode[]> [
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
      let typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      let test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "foo"}, tests: [test]}];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub();

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeInModulesForDependency).to.have.been.calledWith(nodes, Sinon.match.any);
    });

    it("should call findAnalyzedFunctionNodeInModulesForDependency with dependency typeInfo for node.dependencies", () => {
      // arrange
      let typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      let test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "foo"}, tests: [test]}];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub();

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.findAnalyzedFunctionNodeInModulesForDependency).to.have.been.calledWith(Sinon.match.any, typeInfo);
    });

    it("should ignore node.dependencies that cannot be determined", () => {
      // arrange
      let typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      let test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      let nodes = <AnalyzedTestModuleNode[]> [{moduleNode: {name: "foo"}, tests: [test]}];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub().returns(undefined);
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.spy(analyzerImp.updateExposedIndirectlyForFunctionNode);

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledOnce;
    });

    it("should ignore node.dependencies that have already been added", () => {
      // arrange
      let typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      let test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      let moduleNode = <AnalyzedTestModuleNode> {codeInfoKey: "foo", moduleNode: {}, tests: [test]};
      let dependencyFunctionNode = {isExposedIndirectlyBy: [{codeInfoKey: "foo", functionNode: test, occurs: [1]}]};
      let dependency = <AnalyzedFunctionDependency> {functionNode: dependencyFunctionNode, moduleNode};
      let nodes = <AnalyzedTestModuleNode[]> [moduleNode];
      analyzerImp.findAnalyzedFunctionNodeInModulesForDependency = Sinon.stub().returns(dependency);
      analyzerImp.updateExposedIndirectlyForFunctionNode = Sinon.spy(analyzerImp.updateExposedIndirectlyForFunctionNode);

      // act
      analyzerImp.updateExposedIndirectlyForFunctionNode(nodes, nodes[0], test);

      // assert
      expect(analyzerImp.updateExposedIndirectlyForFunctionNode).to.have.been.calledOnce;
    });

    it("should recursively call self for node.dependencies that have already not been added", () => {
      // arrange
      let typeInfo = <ElmTypeInfo> {moduleName: "foo"};
      let test = <AnalyzedTestFunctionNode> {moduleName: "foo", node: {dependencies: [{typeInfo}]}};
      let moduleNode = <AnalyzedTestModuleNode> {codeInfoKey: "foo", moduleNode: {}, tests: [test]};
      let dependencyFunctionNode = <AnalyzedTestFunctionNode> {isExposedIndirectlyBy: [], node: {dependencies: []}};
      let dependency = <AnalyzedFunctionDependency> {functionNode: dependencyFunctionNode, moduleNode};
      let nodes = <AnalyzedTestModuleNode[]> [moduleNode];
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
