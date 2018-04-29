"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {createTestSuiteGenerator, TestSuiteGenerator, TestSuiteGeneratorImp} from "../../../lib/test-suite-generator";
import {
  ElmCodeInfo,
  ElmCodeLookup,
  ElmFunctionNode,
  ElmImportNode,
  ElmModuleNode,
  ElmNode,
  ElmNodeType,
  LoboConfig,
  PluginTestFrameworkWithConfig
} from "../../../lib/plugin";
import {ElmNodeHelper} from "../../../lib/elm-node-helper";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib test-suite-generator", () => {
  let RewiredTestSuiteGenerator = rewire("../../../lib/test-suite-generator");
  let testSuiteGenerator: TestSuiteGeneratorImp;
  let mockIsFunctionNode: Sinon.SinonStub;
  let mockIsImportNode: Sinon.SinonStub;
  let mockLogger: Logger;
  let mockNodeHelper: ElmNodeHelper;
  let mockWriteFileSync: Sinon.SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockWriteFileSync = Sinon.stub();

    revert = RewiredTestSuiteGenerator.__set__({
      fs: {writeFileSync: mockWriteFileSync}
    });
    let rewiredImp = RewiredTestSuiteGenerator.__get__("TestSuiteGeneratorImp");

    mockLogger = <Logger><{}>Sinon.mock();
    mockLogger.debug = Sinon.stub();
    mockLogger.info = Sinon.stub();
    mockLogger.error = Sinon.stub();
    mockIsFunctionNode = Sinon.stub();
    mockIsImportNode = Sinon.stub();
    mockNodeHelper = <ElmNodeHelper><{}> {isFunctionNode: mockIsFunctionNode, isImportNode: mockIsImportNode};
    testSuiteGenerator = new rewiredImp(mockNodeHelper, mockLogger);
  });

  afterEach(() => {
    revert();
  });

  describe("createTestSuiteGenerator", () => {
    it("should return test suite generator", () => {
      // act
      let actual: TestSuiteGenerator = createTestSuiteGenerator();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("findExposedTests", () => {
    it("should call findTestImportNodes with the testFrameworkElmModuleName", () => {
      // arrange
      let mockTestFrameworkElmModuleName = Sinon.stub();
      mockTestFrameworkElmModuleName.returns("foo");
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = mockTestFrameworkElmModuleName;
      let moduleNode = <ElmModuleNode> { children: [], exposing: []};
      testSuiteGenerator.findTestImportNodes = Sinon.spy();

      // act
      testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(testSuiteGenerator.findTestImportNodes).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call findTestImportNodes with the moduleNode.children", () => {
      // arrange
      let expected = <ElmNode[]> [{nodeType: ElmNodeType.Import}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> { children: expected, exposing: []};
      testSuiteGenerator.findTestImportNodes = Sinon.spy();

      // act
      testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(testSuiteGenerator.findTestImportNodes).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findTestFunctions with the moduleNode.children", () => {
      // arrange
      let expected = <ElmNode[]> [{nodeType: ElmNodeType.Import}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> { children: expected, exposing: []};
      testSuiteGenerator.findTestImportNodes = Sinon.stub();
      testSuiteGenerator.findTestFunctions = Sinon.spy();

      // act
      testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(testSuiteGenerator.findTestFunctions).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call findTestFunctions with the found testImportNodes", () => {
      // arrange
      let expected = <ElmImportNode[]> [{nodeType: ElmNodeType.Import}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> { children: [], exposing: []};
      let mockFindTestImportNodes = Sinon.stub();
      mockFindTestImportNodes.returns(expected);
      testSuiteGenerator.findTestImportNodes = mockFindTestImportNodes;
      testSuiteGenerator.findTestFunctions = Sinon.spy();

      // act
      testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(testSuiteGenerator.findTestFunctions).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return an empty array when exposed list is empty", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> { name: "Bar", children: [], exposing: []};
      let mockFindTestImportNodes = Sinon.stub();
      mockFindTestImportNodes.returns(<ElmImportNode[]> [{nodeType: ElmNodeType.Import}]);
      testSuiteGenerator.findTestImportNodes = mockFindTestImportNodes;
      let mockFindTestFunctions = Sinon.stub();
      mockFindTestFunctions.returns(<ElmImportNode[]> [{name: "Baz"}]);
      testSuiteGenerator.findTestFunctions = mockFindTestFunctions;

      // act
      let actual = testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should not return test function nodes that are not exposed", () => {
      // arrange
      let expected = <ElmImportNode[]> [{name: "Baz"}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> { name: "Bar",  children: [], exposing: [{moduleName: "Bar", name: "Baz"}]};
      let mockFindTestImportNodes = Sinon.stub();
      mockFindTestImportNodes.returns(<ElmImportNode[]> [{nodeType: ElmNodeType.Import}]);
      testSuiteGenerator.findTestImportNodes = mockFindTestImportNodes;
      let mockFindTestFunctions = Sinon.stub();
      mockFindTestFunctions.returns([...expected, {name: "Qux"}]);
      testSuiteGenerator.findTestFunctions = mockFindTestFunctions;

      // act
      let actual = testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should return test function nodes that are exposed", () => {
      // arrange
      let expected = <ElmImportNode[]> [{name: "Baz"}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> { name: "Bar",  children: [], exposing: [{moduleName: "Bar", name: "Baz"}]};
      let mockFindTestImportNodes = Sinon.stub();
      mockFindTestImportNodes.returns(<ElmImportNode[]> [{nodeType: ElmNodeType.Import}]);
      testSuiteGenerator.findTestImportNodes = mockFindTestImportNodes;
      let mockFindTestFunctions = Sinon.stub();
      mockFindTestFunctions.returns(expected);
      testSuiteGenerator.findTestFunctions = mockFindTestFunctions;

      // act
      let actual = testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(actual).to.deep.equal(expected);
    });
  });

  describe("findTestFunctions", () => {
    it("should return empty array when there are no functions", () => {
      // arrange
      let nodes = <ElmNode[]> [{name: "foo"}, {name: "bar"}];
      mockIsFunctionNode.returns(false);

      // act
      let actual = testSuiteGenerator.findTestFunctions(nodes, []);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should ignore non test function nodes", () => {
      // arrange
      let expected = {name: "foo"};
      let nodes = <ElmNode[]> [expected, {name: "bar"}];
      mockIsFunctionNode.returns(true);
      let mockIsTestSuiteFunctionNode = Sinon.stub();
      mockIsTestSuiteFunctionNode.returns(false);
      testSuiteGenerator.isTestSuiteFunctionNode = mockIsTestSuiteFunctionNode;
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.returns(false);
      testSuiteGenerator.isTestFunctionNode = mockIsTestFunctionNode;

      // act
      let actual = testSuiteGenerator.findTestFunctions(nodes, []);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return test suite function nodes", () => {
      // arrange
      let expected = {name: "foo"};
      let nodes = <ElmNode[]> [expected, {name: "bar"}];
      mockIsFunctionNode.returns(true);
      let mockIsTestSuiteFunctionNode = Sinon.stub();
      mockIsTestSuiteFunctionNode.withArgs(Sinon.match.any, expected).returns(true);
      mockIsTestSuiteFunctionNode.returns(false);
      testSuiteGenerator.isTestSuiteFunctionNode = mockIsTestSuiteFunctionNode;
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.returns(false);
      testSuiteGenerator.isTestFunctionNode = mockIsTestFunctionNode;

      // act
      let actual = testSuiteGenerator.findTestFunctions(nodes, []);

      // assert
      expect(actual).to.deep.equal([expected]);
    });

    it("should return test function nodes", () => {
      // arrange
      let expected = {name: "foo"};
      let nodes = <ElmNode[]> [expected, {name: "bar"}];
      mockIsFunctionNode.returns(true);
      let mockIsTestSuiteFunctionNode = Sinon.stub();
      mockIsTestSuiteFunctionNode.returns(false);
      testSuiteGenerator.isTestSuiteFunctionNode = mockIsTestSuiteFunctionNode;
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(Sinon.match.any, expected).returns(true);
      mockIsTestFunctionNode.returns(false);
      testSuiteGenerator.isTestFunctionNode = mockIsTestFunctionNode;

      // act
      let actual = testSuiteGenerator.findTestFunctions(nodes, []);

      // assert
      expect(actual).to.deep.equal([expected]);
    });
  });

  describe("findTestImportNodes", () => {
    it("should return empty array when the testModuleImportName cannot be found", () => {
      // arrange
      let nodes = <ElmNode[]> [{name: "foo"}, {name: "bar"}];
      mockIsImportNode.returns(true);

      // act
      let actual = testSuiteGenerator.findTestImportNodes("baz", nodes);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return empty array when the name can be found on a non import node", () => {
      // arrange
      let nodes = <ElmNode[]> [{name: "foo"}, {name: "bar"}];
      mockIsImportNode.returns(false);

      // act
      let actual = testSuiteGenerator.findTestImportNodes("foo", nodes);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return import nodes with the test import name", () => {
      // arrange
      let expected = {name: "foo"};
      let nodes = <ElmNode[]> [expected, {name: "bar"}];
      mockIsImportNode.returns(true);

      // act
      let actual = testSuiteGenerator.findTestImportNodes("foo", nodes);

      // assert
      expect(actual).to.deep.equal([expected]);
    });
  });

  describe("findTestModuleNodes", () => {
    it("should not call findExposedTests for non test modules", () => {
      // arrange
      let expected = {dependencies: []};
      let config = <LoboConfig><{}>{testFramework: expected};
      let codeLookup = <ElmCodeLookup> { foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: false, moduleNode: {}}};
      testSuiteGenerator.findExposedTests = Sinon.spy();

      // act
      testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(testSuiteGenerator.findExposedTests).not.to.have.been.called;
    });

    it("should call findExposedTests with the config.testFramework", () => {
      // arrange
      let expected = {dependencies: []};
      let config = <LoboConfig><{}>{testFramework: expected};
      let codeLookup = <ElmCodeLookup> { foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: {}}};
      testSuiteGenerator.findExposedTests = Sinon.spy();

      // act
      testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(testSuiteGenerator.findExposedTests).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call findExposedTests with the moduleNode", () => {
      // arrange
      let expected = {nodeType: ElmNodeType.Module};
      let config = <LoboConfig><{}>{testFramework: {}};
      let codeLookup = <ElmCodeLookup> { foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: expected}};
      testSuiteGenerator.findExposedTests = Sinon.spy();

      // act
      testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(testSuiteGenerator.findExposedTests).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return an empty list when there are no test modules", () => {
      // arrange
      let config = <LoboConfig><{}>{testFramework: {}};
      let codeLookup = <ElmCodeLookup> { foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: false, moduleNode: {}}};
      testSuiteGenerator.findExposedTests = Sinon.stub();

      // act
      let actual = testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return test module with exposed tests", () => {
      // arrange
      let config = <LoboConfig><{}>{testFramework: {}};
      let foo = <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: {name: "Foo"}};
      let bar = <ElmCodeInfo> {filePath: "./bar", isTestFile: true, moduleNode: {name: "Bar"}};
      let codeLookup = <ElmCodeLookup> {foo, bar};
      let mockFindExposedTests = Sinon.stub();
      let fooTests = <ElmFunctionNode[]> [{name: "fooTest"}];
      let barTests = <ElmFunctionNode[]> [{name: "barTest"}];
      mockFindExposedTests.withArgs(Sinon.match.any, foo.moduleNode).returns(fooTests);
      mockFindExposedTests.withArgs(Sinon.match.any, bar.moduleNode).returns(barTests);
      testSuiteGenerator.findExposedTests = mockFindExposedTests;

      // act
      let actual = testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({filePath: foo.filePath, moduleNode: foo.moduleNode, tests: fooTests});
      expect(actual[1]).to.deep.equal({filePath: bar.filePath, moduleNode: bar.moduleNode, tests: barTests});
    });
  });

  describe("isTestFunctionNode", () => {
    it("should return false when node is not a test function node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {dependencies: [{moduleName: "foo", name: "expect"}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a test node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {dependencies: [{moduleName: "foo", name: "test"}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz test node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {dependencies: [{moduleName: "foo", name: "fuzz"}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isTestSuiteFunctionNode", () => {
    it("should return false when node is not a test function node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {dependencies: [{moduleName: "foo", name: "expect"}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a describe node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {dependencies: [{moduleName: "foo", name: "describe"}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a concat node", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {dependencies: [{moduleName: "foo", name: "concat"}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNode(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });
  });
});
