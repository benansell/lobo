"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {
  createTestSuiteGenerator,
  SuiteStructureNode,
  TestModuleNode,
  TestSuiteGenerator,
  TestSuiteGeneratorImp
} from "../../../lib/test-suite-generator";
import {
  ElmCodeInfo,
  ElmCodeLookup,
  ElmFunctionNode,
  ElmImportNode,
  ElmModuleNode,
  ElmNode,
  ElmNodeType, ExecutionContext,
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
  let mockWriteFile: Sinon.SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockWriteFile = Sinon.stub();

    revert = RewiredTestSuiteGenerator.__set__({
      fs: {writeFile: mockWriteFile},
      os: {EOL: "\n"}
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

  describe("buildSuiteStructure", () => {
    it("should return a root node with the label 'Unit Tests'", () => {
      // act
      let actual = testSuiteGenerator.buildSuiteStructure([]);

      // assert
      expect(actual.label).to.equal("Unit Tests");
    });

    it("should return a root node with the name 'all'", () => {
      // act
      let actual = testSuiteGenerator.buildSuiteStructure([]);

      // assert
      expect(actual.name).to.equal("all");
    });

    it("should return a root node with empty childNodes when they are not sub modules", () => {
      // arrange
      const testModules = <TestModuleNode[]> [{moduleNode: {name: "Foo"}}, {moduleNode: {name: "Bar"}}];

      // act
      let actual = testSuiteGenerator.buildSuiteStructure(testModules);

      // assert
      expect(actual.childNodes).to.deep.equal([]);
    });

    it("should return a root node with childTests of test modules when they are not sub modules", () => {
      // arrange
      const testModules = <TestModuleNode[]> [{moduleNode: {name: "Foo"}}, {moduleNode: {name: "Bar"}}];

      // act
      let actual = testSuiteGenerator.buildSuiteStructure(testModules);

      // assert
      expect(actual.childTests).to.deep.equal([testModules[0], testModules[1]]);
    });

    it("should return a root node with childNodes when they are sub modules", () => {
      // arrange
      const testModules = <TestModuleNode[]> [{moduleNode: {name: "Foo.Bar"}}, {moduleNode: {name: "Foo.Baz"}}];

      // act
      let actual = testSuiteGenerator.buildSuiteStructure(testModules);

      // assert
      expect(actual.childTests).to.deep.equal([]);
      expect(actual.childNodes[0]).to.deep
        .equal({label: "Foo", name: "foo", childNodes: [], childTests: [testModules[0], testModules[1]]});
    });

    it("should return a root node with mixture of nodes for when there are modules and submodules", () => {
      // arrange
      const testModules = <TestModuleNode[]> [{moduleNode: {name: "Foo"}}, {moduleNode: {name: "Foo.Baz"}}];

      // act
      let actual = testSuiteGenerator.buildSuiteStructure(testModules);

      // assert
      expect(actual.childTests).to.deep.equal([testModules[0]]);
      expect(actual.childNodes[0]).to.deep
        .equal({label: "Foo", name: "foo", childNodes: [], childTests: [testModules[1]]});
    });
  });

  describe("findExposedTests", () => {
    it("should call findTestImportNodes with the testFrameworkElmModuleName", () => {
      // arrange
      let mockTestFrameworkElmModuleName = Sinon.stub();
      mockTestFrameworkElmModuleName.returns("foo");
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = mockTestFrameworkElmModuleName;
      let moduleNode = <ElmModuleNode> {children: [], exposing: []};
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
      let moduleNode = <ElmModuleNode> {children: expected, exposing: []};
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
      let moduleNode = <ElmModuleNode> {children: expected, exposing: []};
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
      let moduleNode = <ElmModuleNode> {children: [], exposing: []};
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
      let moduleNode = <ElmModuleNode> {name: "Bar", children: [], exposing: []};
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
      let moduleNode = <ElmModuleNode> {name: "Bar", children: [], exposing: [{moduleName: "Bar", name: "Baz"}]};
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

    it("should not return test function nodes that are exposed from a different moduleName", () => {
      // arrange
      let expected = <ElmImportNode[]> [{name: "Baz"}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> {name: "Bar", children: [], exposing: [{moduleName: "Qux", name: "Baz"}]};
      let mockFindTestImportNodes = Sinon.stub();
      mockFindTestImportNodes.returns(<ElmImportNode[]> [{nodeType: ElmNodeType.Import}]);
      testSuiteGenerator.findTestImportNodes = mockFindTestImportNodes;
      let mockFindTestFunctions = Sinon.stub();
      mockFindTestFunctions.returns(expected);
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
      let moduleNode = <ElmModuleNode> {name: "Bar", children: [], exposing: [{moduleName: "Bar", name: "Qux"}]};
      let mockFindTestImportNodes = Sinon.stub();
      mockFindTestImportNodes.returns(<ElmImportNode[]> [{nodeType: ElmNodeType.Import}]);
      testSuiteGenerator.findTestImportNodes = mockFindTestImportNodes;
      let mockFindTestFunctions = Sinon.stub();
      mockFindTestFunctions.returns(expected);
      testSuiteGenerator.findTestFunctions = mockFindTestFunctions;

      // act
      let actual = testSuiteGenerator.findExposedTests(testFramework, moduleNode);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return test function nodes that are exposed", () => {
      // arrange
      let expected = <ElmImportNode[]> [{name: "Baz"}];
      let testFramework = <PluginTestFrameworkWithConfig> {};
      testFramework.testFrameworkElmModuleName = () => "foo";
      let moduleNode = <ElmModuleNode> {name: "Bar", children: [], exposing: [{moduleName: "Bar", name: "Baz"}]};
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

  describe("findParent", () => {
    it("should return undefined when there are no matching labels", () => {
      // arrange
      const structureNode = <SuiteStructureNode> {label: "bar", childNodes: []};

      // act
      let actual = testSuiteGenerator.findParent(structureNode, "foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return supplied node when the node.label is the label", () => {
      // arrange
      const expected = <SuiteStructureNode> {label: "foo"};

      // act
      let actual = testSuiteGenerator.findParent(expected, "foo");

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return child node with matching label", () => {
      // arrange
      const structureNode = <SuiteStructureNode> {label: "bar", childNodes: [{label: "foo"}]};

      // act
      let actual = testSuiteGenerator.findParent(structureNode, "foo");

      // assert
      expect(actual).to.equal(structureNode.childNodes[0]);
    });

    it("should return child node with matching label when other child nodes exist", () => {
      // arrange
      const structureNode = <SuiteStructureNode> {label: "bar", childNodes: [{label: "baz", childNodes: []}, {label: "foo"}]};

      // act
      let actual = testSuiteGenerator.findParent(structureNode, "foo");

      // assert
      expect(actual).to.equal(structureNode.childNodes[1]);
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
      testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments = mockIsTestSuiteFunctionNode;
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.returns(false);
      testSuiteGenerator.isTestFunctionNodeWithoutArguments = mockIsTestFunctionNode;

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
      testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments = mockIsTestSuiteFunctionNode;
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.returns(false);
      testSuiteGenerator.isTestFunctionNodeWithoutArguments = mockIsTestFunctionNode;

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
      testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments = mockIsTestSuiteFunctionNode;
      let mockIsTestFunctionNode = Sinon.stub();
      mockIsTestFunctionNode.withArgs(Sinon.match.any, expected).returns(true);
      mockIsTestFunctionNode.returns(false);
      testSuiteGenerator.isTestFunctionNodeWithoutArguments = mockIsTestFunctionNode;

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
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: false, moduleNode: {}}};
      testSuiteGenerator.findExposedTests = Sinon.spy();

      // act
      testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(testSuiteGenerator.findExposedTests).not.to.have.been.called;
    });

    it("should not call findExposedTests for codeInfo keys that are not own", () => {
      // arrange
      let expected = {dependencies: []};
      let config = <LoboConfig><{}>{testFramework: expected};
      let parentCodeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: {}}};
      let codeLookup = Object.create(parentCodeLookup);
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
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: {}}};
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
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: true, moduleNode: expected}};
      testSuiteGenerator.findExposedTests = Sinon.spy();

      // act
      testSuiteGenerator.findTestModuleNodes(config, codeLookup);

      // assert
      expect(testSuiteGenerator.findExposedTests).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should return an empty list when there are no test modules", () => {
      // arrange
      let config = <LoboConfig><{}>{testFramework: {}};
      let codeLookup = <ElmCodeLookup> {foo: <ElmCodeInfo> {filePath: "./foo", isTestFile: false, moduleNode: {}}};
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

  describe("generate", () => {
    it("should return a promise that calls findTestModuleNodes with the context.config", () => {
      // arrange
      let expected = <LoboConfig> {loboDirectory: "./foo"};
      let context = <ExecutionContext> {config: expected};
      testSuiteGenerator.findTestModuleNodes = Sinon.spy();
      testSuiteGenerator.generateTestSuiteCode = Sinon.spy();
      mockWriteFile.callsFake((filePath, content, callback) => callback());

      // act
      let actual = testSuiteGenerator.generate(context);

      // assert
      return actual.then(() => {
        expect(testSuiteGenerator.findTestModuleNodes).to.have.been.calledWith(expected, Sinon.match.any);
      });
    });

    it("should return a promise that calls findTestModuleNodes with the context.codeLookup", () => {
      // arrange
      let expected = <ElmCodeLookup> {foo: <ElmCodeInfo>{}};
      let context = <ExecutionContext> {codeLookup: expected};
      testSuiteGenerator.findTestModuleNodes = Sinon.spy();
      testSuiteGenerator.generateTestSuiteCode = Sinon.spy();
      mockWriteFile.callsFake((filePath, content, callback) => callback());

      // act
      let actual = testSuiteGenerator.generate(context);

      // assert
      return actual.then(() => {
        expect(testSuiteGenerator.findTestModuleNodes).to.have.been.calledWith(Sinon.match.any, expected);
      });
    });

    it("should return a promise that calls generateTestSuiteCode with the context.config", () => {
      // arrange
      let expected = <LoboConfig> {loboDirectory: "./foo"};
      let context = <ExecutionContext> {config: expected};
      testSuiteGenerator.findTestModuleNodes = Sinon.spy();
      testSuiteGenerator.generateTestSuiteCode = Sinon.spy();
      mockWriteFile.callsFake((filePath, content, callback) => callback());

      // act
      let actual = testSuiteGenerator.generate(context);

      // assert
      return actual.then(() => {
        expect(testSuiteGenerator.generateTestSuiteCode).to.have.been.calledWith(expected, Sinon.match.any);
      });
    });

    it("should return a promise that calls generateTestSuiteCode with the found testModuleNodes", () => {
      // arrange
      let expected = <TestModuleNode[]> [{filePath: "./foo"}];
      let mockFindTestModuleNodes = Sinon.stub();
      mockFindTestModuleNodes.returns(expected);
      testSuiteGenerator.findTestModuleNodes = mockFindTestModuleNodes;
      testSuiteGenerator.generateTestSuiteCode = Sinon.spy();
      mockWriteFile.callsFake((filePath, content, callback) => callback());

      // act
      let actual = testSuiteGenerator.generate(<ExecutionContext> {});

      // assert
      return actual.then(() => {
        expect(testSuiteGenerator.generateTestSuiteCode).to.have.been.calledWith(Sinon.match.any, expected);
      });
    });

    it("should return a promise that calls fs.writeFile with the context.testSuiteOutputFilePath", () => {
      // arrange
      let expected = "./foo";
      let context = <ExecutionContext> {testSuiteOutputFilePath: expected};
      testSuiteGenerator.findTestModuleNodes = Sinon.spy();
      testSuiteGenerator.generateTestSuiteCode = Sinon.spy();
      mockWriteFile.callsFake((filePath, content, callback) => callback());

      // act
      let actual = testSuiteGenerator.generate(context);

      // assert
      return actual.then(() => {
        expect(mockWriteFile).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls fs.writeFile with the content from generateTestSuiteCode", () => {
      // arrange
      let expected = "foo bar";
      testSuiteGenerator.findTestModuleNodes = Sinon.spy();
      let mockGenerateTestSuiteCode = Sinon.stub();
      mockGenerateTestSuiteCode.returns(expected);
      testSuiteGenerator.generateTestSuiteCode = mockGenerateTestSuiteCode;
      mockWriteFile.callsFake((filePath, content, callback) => callback());

      // act
      let actual = testSuiteGenerator.generate(<ExecutionContext> {});

      // assert
      return actual.then(() => {
        expect(mockWriteFile).to.have.been.calledWith(Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should return a promise that calls fs.writeFile with a callback that logs error", () => {
      // arrange
      let expected = "foo bar";
      testSuiteGenerator.findTestModuleNodes = Sinon.spy();
      let mockGenerateTestSuiteCode = Sinon.stub();
      mockGenerateTestSuiteCode.returns(expected);
      testSuiteGenerator.generateTestSuiteCode = mockGenerateTestSuiteCode;
      mockWriteFile.callsFake((filePath, content, callback) => callback(new Error()));

      // act
      let actual = testSuiteGenerator.generate(<ExecutionContext> {});

      // assert
      return actual.catch(() => {
        expect(mockLogger.error).to.have.been.called;
      });
    });
  });

  describe("generateTestSuiteCode", () => {
    it("should return code with module definition", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/^module UnitTest exposing \(main\)/);
    });

    it("should return code with standard test imports", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/import Json.Decode exposing \(Value\)/);
      expect(actual).to.match(/import TestRunner as Runner/);
    });

    it("should return code with test framework imports", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/import Foo as TestPlugin/);
      expect(actual).to.match(/import Bar exposing \(Test, describe\)/);
    });

    it("should return code with test module node imports", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};
      let testModuleNodes = <TestModuleNode[]> [
        {moduleNode: {name: "SuiteOne"}, tests: [{name: "TestOne"}]},
        {moduleNode: {name: "SuiteTwo"}, tests: [{name: "TestTwo"}]}
      ];

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, testModuleNodes);

      // assert
      expect(actual).to.match(/import SuiteOne exposing \(TestOne\)/);
      expect(actual).to.match(/import SuiteTwo exposing \(TestTwo\)/);
    });

    it("should return code with main function that calls Runner.run plugin", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/main : Program Value \(Runner\.Model TestPlugin\.TestArgs TestPlugin\.TestRunner\) Runner\.Msg/);
      expect(actual).to.match(/main =\n\s{4}Runner\.run plugin/);
    });

    it("should return code with plugin function definition for findTests", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/plugin : Runner\.Plugin TestPlugin\.TestArgs TestPlugin\.TestRunner/);
      expect(actual).to.match(/plugin =\n\s{4}{ findTests = TestPlugin.findTests all/);
    });

    it("should return code with plugin function definition for runTest", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/plugin : Runner\.Plugin TestPlugin\.TestArgs TestPlugin\.TestRunner/);
      expect(actual).to.match(/plugin =\n\s{4}.*\n\s{4}, runTest = TestPlugin.runTest/);
    });

    it("should return code with plugin function definition for toArgs", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {pluginElmModuleName: () => "Foo", testFrameworkElmModuleName: () => "Bar"};
      let config = <LoboConfig> {testFramework};

      // act
      let actual = testSuiteGenerator.generateTestSuiteCode(config, []);

      // assert
      expect(actual).to.match(/plugin : Runner\.Plugin TestPlugin\.TestArgs TestPlugin\.TestRunner/);
      expect(actual).to.match(/plugin =(\n\s{4}.*){2}\n\s{4}, toArgs = TestPlugin.toArgs\n\s{4}}/);
    });
  });

  describe("generateTestSuiteForStructure", () => {
    it("should add code with empty all module test definition when there are no test nodes", () => {
      // arrange
      let suiteStructureNode = <SuiteStructureNode> {label: "SuiteOne", name: "suiteOne", childNodes: [], childTests: []};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForStructure("    ", lines, suiteStructureNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/suiteOne : Test/);
      expect(actual).to.match(/suiteOne =\n\s{4}describe "SuiteOne"\n\s{8}\[]/);
    });

    it("should add code for each child node with the child name for the node", () => {
      // arrange
      let childNodes = <SuiteStructureNode[]> [
        {label: "TestOne", name: "testOne", childNodes: [], childTests: []},
        {label: "TestTwo", name: "testTwo", childNodes: [], childTests: []}];
      let suiteStructureNode = <SuiteStructureNode> {label: "Baz", name: "suiteOne", childNodes, childTests: []};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForStructure("    ", lines, suiteStructureNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/suiteOne : Test/);
      expect(actual).to.match(/suiteOne =\n\s{4}describe "Baz"\n\s{8}\[ testOne\n\s{8}, testTwo\n\s{8}]/);
    });

    it("should add code for each child tests with the suite name for the test module", () => {
      // arrange
      let childTests = <TestModuleNode[]> [{moduleNode: {name: "TestOne"}}, {moduleNode: {name: "TestTwo"}}];
      let suiteStructureNode = <SuiteStructureNode> {label: "Baz", name: "suiteOne", childNodes: [], childTests};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForStructure("    ", lines, suiteStructureNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/suiteOne : Test/);
      expect(actual).to.match(/suiteOne =\n\s{4}describe "Baz"\n\s{8}\[ allTestOne\n\s{8}, allTestTwo\n\s{8}]/);
    });

    it("should recursively call self to add code for each child node with the child name for the node", () => {
      // arrange
      let grandChildNodes = <SuiteStructureNode[]> [{label: "TestTwo", name: "testTwo", childNodes: [], childTests: []}];
      let childNodes = <SuiteStructureNode[]> [{label: "TestOne", name: "testOne", childNodes: grandChildNodes, childTests: []}];
      let suiteStructureNode = <SuiteStructureNode> {label: "Baz", name: "suiteOne", childNodes, childTests: []};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForStructure("    ", lines, suiteStructureNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/suiteOne : Test/);
      expect(actual).to.match(/suiteOne =\n\s{4}describe "Baz"\n\s{8}\[ testOne\n\s{8}]/);
      expect(actual).to.match(/testOne =\n\s{4}describe "TestOne"\n\s{8}\[ testTwo\n\s{8}]/);
    });
  });

  describe("generateTestSuiteForModule", () => {
    it("should add code with empty all module test definition when there are no test nodes", () => {
      // arrange
      let testModuleNode = <TestModuleNode> {moduleNode: {name: "SuiteOne"}, tests: []};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForModule("    ", lines, testModuleNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/allSuiteOne : Test/);
      expect(actual).to.match(/allSuiteOne =\n\s{4}describe "SuiteOne"\n\s{8}\[]/);
    });

    it("should add code with all module test definition with suite name for module nodes", () => {
      // arrange
      let testModuleNode = <TestModuleNode> {moduleNode: {name: "Foo.Bar.Baz"}, tests: [{name: "TestOne"}, {name: "TestTwo"}]};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForModule("    ", lines, testModuleNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/allFooBarBaz : Test/);
      expect(actual)
        .to.match(/allFooBarBaz =\n\s{4}describe "Baz"\n\s{8}\[ Foo\.Bar\.Baz\.TestOne\n\s{8}, Foo\.Bar\.Baz\.TestTwo\n\s{8}]/);
    });

    it("should add code with all module test definition that contains all the test module nodes", () => {
      // arrange
      let testModuleNode = <TestModuleNode> {moduleNode: {name: "SuiteOne"}, tests: [{name: "TestOne"}, {name: "TestTwo"}]};

      // act
      let lines = [];
      testSuiteGenerator.generateTestSuiteForModule("    ", lines, testModuleNode);

      // assert
      const actual = lines.join("\n");
      expect(actual).to.match(/allSuiteOne : Test/);
      expect(actual).to.match(/allSuiteOne =\n\s{4}describe "SuiteOne"\n\s{8}\[ SuiteOne\.TestOne\n\s{8}, SuiteOne\.TestTwo\n\s{8}]/);
    });
  });

  describe("isTestFunctionNodeWithoutArguments", () => {
    it("should return false when node is not a test function node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "expect"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when node is not a test node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["baz"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "test"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "test"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when node is not a fuzz test node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["baz"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a fuzz test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz2 test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz2"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz3 test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz3"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz4 test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz4"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzz5 test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzz5"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when node is not a fuzzWith test node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "fuzzWith"}}]};

      // act
      let actual = testSuiteGenerator.isTestFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isTestSuiteFunctionNodeWithoutArguments", () => {
    it("should return false when node is not a test function node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "expect"}}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when node is not a describe node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["bar"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "describe"}}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a describe node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "describe"}}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when node is not a concat node with arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: ["bar"], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "concat"}}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when node is not a concat node with no arguments", () => {
      // arrange
      let testImportNodes = <ElmImportNode[]> [{name: "foo"}];
      let node = <ElmFunctionNode> {arguments: [], dependencies: [{occurs: [1], typeInfo: {moduleName: "foo", name: "concat"}}]};

      // act
      let actual = testSuiteGenerator.isTestSuiteFunctionNodeWithoutArguments(testImportNodes, node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("toDescriptionForTestModule", () => {
    it("should return empty string when module name is empty", () => {
      // act
      let actual = testSuiteGenerator.toDescriptionForTestModule(<TestModuleNode>{moduleNode: {name: ""}});

      // assert
      expect(actual).to.equal("");
    });

    it("should return last part of moduleName when it contains '.'", () => {
      // act
      let actual = testSuiteGenerator.toDescriptionForTestModule(<TestModuleNode>{moduleNode: {name: "Foo.Bar.Baz"}});

      // assert
      expect(actual).to.equal("Baz");
    });

    it("should return moduleName when it contains no '.'", () => {
      // act
      let actual = testSuiteGenerator.toDescriptionForTestModule(<TestModuleNode>{moduleNode: {name: "FooBarBaz"}});

      // assert
      expect(actual).to.equal("FooBarBaz");
    });

    it("should return last part of moduleName when it contains '.'", () => {
      // act
      let actual = testSuiteGenerator.toDescriptionForTestModule(<TestModuleNode>{moduleNode: {name: "Foo.Bar.Baz"}});

      // assert
      expect(actual).to.equal("Baz");
    });
  });

  describe("toSuiteNameForStructure", () => {
    it("should return label without changes when first character is lowercase and parent is empty", () => {
      // act
      let actual = testSuiteGenerator.toSuiteNameForStructure("", "foo");

      // assert
      expect(actual).to.equal("foo");
    });

    it("should return label with first character lowercase when parent is empty", () => {
      // act
      let actual = testSuiteGenerator.toSuiteNameForStructure("", "Foo");

      // assert
      expect(actual).to.equal("foo");
    });

    it("should return parentName and label with first character lowercase when parent is not empty", () => {
      // act
      let actual = testSuiteGenerator.toSuiteNameForStructure("Foo", "Bar");

      // assert
      expect(actual).to.equal("fooBar");
    });
  });

  describe("toSuiteNameForTestModule", () => {
    it("should return moduleName with 'all' prefix when it contains no '.'", () => {
      // act
      let actual = testSuiteGenerator.toSuiteNameForTestModule(<TestModuleNode>{moduleNode: {name: "FooBarBaz"}});

      // assert
      expect(actual).to.equal("allFooBarBaz");
    });

    it("should return moduleName with 'all' prefix and '.' replaced by empty string when it contains '.'", () => {
      // act
      let actual = testSuiteGenerator.toSuiteNameForTestModule(<TestModuleNode>{moduleNode: {name: "Foo.Bar.Baz"}});

      // assert
      expect(actual).to.equal("allFooBarBaz");
    });
  });
});
