import * as Bluebird from "bluebird";
import {
  ElmCodeInfo,
  ElmCodeLookup,
  ElmFunctionNode,
  ElmImportNode,
  ElmModuleNode,
  ElmNode, ElmTestSuiteType, ElmTestType,
  ExecutionContext,
  LoboConfig,
  PluginTestFrameworkWithConfig,
  Reject,
  Resolve
} from "./plugin";
import {createLogger, Logger} from "./logger";
import {createElmNodeHelper, ElmNodeHelper} from "./elm-node-helper";
import * as os from "os";
import * as fs from "fs";

export interface TestModuleNode {
  filePath: string;
  moduleNode: ElmModuleNode;
  tests: ElmFunctionNode[];
}

export interface SuiteStructureNode {
  childNodes: SuiteStructureNode[];
  childTests: TestModuleNode[];
  label: string;
  name: string;
}

export interface TestSuiteGenerator {
  generate(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class TestSuiteGeneratorImp implements TestSuiteGenerator {

  private readonly elmNodeHelper: ElmNodeHelper;
  private logger: Logger;

  constructor(elmNodeHelper: ElmNodeHelper, logger: Logger) {
    this.elmNodeHelper = elmNodeHelper;
    this.logger = logger;
  }

  public buildSuiteStructure(testModuleNodes: TestModuleNode[]): SuiteStructureNode {
    const suite: SuiteStructureNode = {label: "Unit Tests", childNodes: [], childTests: [], name: ""};

    for (const tmn of testModuleNodes) {
      const labelList = tmn.moduleNode.name.split(".").reverse();
      let parent: SuiteStructureNode = suite;
      let label: string | undefined = suite.label;

      while (label !== undefined) {
        let nextParent = this.findParent(parent, label);

        if (!nextParent) {
          nextParent = {label: label, childNodes: [], childTests: [], name: this.toSuiteNameForStructure(parent.name, label)};
          parent.childNodes.push(nextParent);
        }

        parent = nextParent;

        if (labelList.length === 1) {
          parent.childTests.push(tmn);
          break;
        }

        label = labelList.pop();
      }
    }

    suite.name = "all";

    return suite;
  }

  public findExposedTests(testFramework: PluginTestFrameworkWithConfig, moduleNode: ElmModuleNode): ElmFunctionNode[] {
    const testImportNodes = this.findTestImportNodes(testFramework.testFrameworkElmModuleName(), moduleNode.children);
    const testNodes = this.findTestFunctions(moduleNode.children, testImportNodes);
    const result: ElmFunctionNode[] = [];

    for (const e of moduleNode.exposing) {
      if (e.moduleName === moduleNode.name) {
        const matchingNodes = testNodes.filter(x => x.name === e.name);

        if (matchingNodes.length > 0) {
          result.push(...matchingNodes);
        }
      }
    }

    return result;
  }

  public findParent(node: SuiteStructureNode, label: string): SuiteStructureNode | undefined {
    if (node.label === label) {
      return node;
    }

    for (const n of node.childNodes) {
      const childResult = this.findParent(n, label);

      if (childResult) {
        return childResult;
      }
    }

    return undefined;
  }

  public findTestFunctions(nodes: ElmNode[], testImportNodes: ElmImportNode[]): ElmFunctionNode[] {
    const result: ElmFunctionNode[] = [];

    for (const n of nodes) {
      if (this.elmNodeHelper.isFunctionNode(n)) {
        if (this.isTestSuiteFunctionNodeWithoutArguments(testImportNodes, n)
          || this.isTestFunctionNodeWithoutArguments(testImportNodes, n)) {
          result.push(n);
        }
      }
    }

    return result;
  }

  public findTestImportNodes(testModuleImportName: string, nodes: ElmNode[]): ElmImportNode[] {
    const importNodes: ElmImportNode[] = [];

    for (const node of nodes) {
      if (this.elmNodeHelper.isImportNode(node)) {
        if (node.name === testModuleImportName) {
          importNodes.push(node);
        }
      }
    }

    return importNodes;
  }

  public findTestModuleNodes(config: LoboConfig, codeLookup: ElmCodeLookup): TestModuleNode[] {
    const results: TestModuleNode[] = [];

    for (const key in codeLookup) {
      if (codeLookup.hasOwnProperty(key)) {
        const codeInfo: ElmCodeInfo = codeLookup[key];

        if (codeInfo && codeInfo.isTestFile && codeInfo.moduleNode) {
          const moduleNode = codeInfo.moduleNode;
          const tests = this.findExposedTests(config.testFramework, moduleNode);
          results.push({ filePath: codeInfo.filePath, moduleNode, tests});
        }
      }
    }

    return results;
  }

  public generate(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      const testModuleNodes = this.findTestModuleNodes(context.config, context.codeLookup);
      const content = this.generateTestSuiteCode(context.config, testModuleNodes);

      fs.writeFile(context.testSuiteOutputFilePath, content, err => {
        if (!err) {
          resolve(context);
          return;
        }

        this.logger.error("Unable to generate test suite", err);
        reject(err);
      });
    });
  }

  public generateTestSuiteCode(config: LoboConfig, testModuleNodes: TestModuleNode[]): string {
    const indent = "    ";
    const lines: string[] = ["module UnitTest exposing (main)", ""];
    lines.push("import Json.Decode exposing (Value)");
    lines.push("import TestRunner as Runner");
    lines.push(`import ${config.testFramework.pluginElmModuleName()} as TestPlugin`);
    lines.push(`import ${config.testFramework.testFrameworkElmModuleName()} exposing (Test, describe)`);

    testModuleNodes.forEach((tm) => {
      let exposed: string[] = [];
      tm.tests.forEach(t => exposed.push(t.name));
      lines.push(`import ${tm.moduleNode.name} exposing (${exposed.join(", ")})`);
    });

    lines.push("");
    lines.push("");
    lines.push("main : Program Value (Runner.Model TestPlugin.TestArgs TestPlugin.TestRunner) Runner.Msg");
    lines.push("main =");
    lines.push(indent + "Runner.run plugin");
    lines.push("");
    lines.push("");
    lines.push("plugin : Runner.Plugin TestPlugin.TestArgs TestPlugin.TestRunner");
    lines.push("plugin =");
    lines.push(indent + "{ findTests = TestPlugin.findTests all");
    lines.push(indent + ", runTest = TestPlugin.runTest");
    lines.push(indent + ", toArgs = TestPlugin.toArgs");
    lines.push(indent + "}");

    const suite = this.buildSuiteStructure(testModuleNodes);
    this.generateTestSuiteForStructure(indent, lines, suite);

    for (const tmn of testModuleNodes) {
      this.generateTestSuiteForModule(indent, lines, tmn);
    }

    return lines.join(os.EOL);
  }

  public generateTestSuiteForStructure(indent: string, lines: string[], suite: SuiteStructureNode): void {
    lines.push("");
    lines.push("");
    lines.push(suite.name + " : Test");
    lines.push(suite.name + " =");
    lines.push(`${indent}describe "${suite.label}"`);

    if (suite.childNodes.length === 0 && suite.childTests.length === 0) {
      lines.push(`${indent}${indent}[]`);
    } else {
      let isFirst = true;
      const firstTestIndent = indent + indent + "[ ";
      const restTestIndent = indent + indent + ", ";

      for (const child of suite.childNodes) {
        let prefix = isFirst ? firstTestIndent : restTestIndent;
        lines.push(`${prefix}${child.name}`);
        isFirst = false;
      }

      for (const child of suite.childTests) {
        let prefix = isFirst ? firstTestIndent : restTestIndent;
        lines.push(`${prefix}${this.toSuiteNameForTestModule(child)}`);
        isFirst = false;
      }

      lines.push(indent + indent + "]");

      for (const child of suite.childNodes) {
        this.generateTestSuiteForStructure(indent, lines, child);
      }
    }
  }

  public generateTestSuiteForModule(indent: string, lines: string[], testModuleNode: TestModuleNode): void {
    const name = this.toSuiteNameForTestModule(testModuleNode);
    const description = this.toDescriptionForTestModule(testModuleNode);
    lines.push("");
    lines.push("");
    lines.push(name + " : Test");
    lines.push(name + " =");
    lines.push(`${indent}describe "${description}"`);

    if (testModuleNode.tests.length === 0) {
      lines.push(`${indent}${indent}[]`);
    } else {
      const firstTestIndent = indent + indent + "[ ";
      const restTestIndent = indent + indent + ", ";

      for (let j = 0; j < testModuleNode.tests.length; j++) {
        const t = testModuleNode.tests[j];
        let prefix = j === 0 ? firstTestIndent : restTestIndent;
        lines.push(`${prefix}${testModuleNode.moduleNode.name}.${t.name}`);
      }

      lines.push(indent + indent + "]");
    }
  }

  public isTestFunctionNodeWithoutArgumentsOfType<T extends string>(testImportNodes: ElmImportNode[], node: ElmFunctionNode,
                                                                    testTypes: T[]): boolean {
    for (const importNode of testImportNodes) {
      for (const d of node.dependencies) {
        const ti = d.typeInfo;

        if (node.arguments.length === 0 && ti.moduleName === importNode.name && testTypes.indexOf(<T> ti.name) > -1) {
          return true;
        }
      }
    }

    return false;
  }

  public isTestFunctionNodeWithoutArguments(testImportNodes: ElmImportNode[], node: ElmFunctionNode): boolean {
    const testTypes: ElmTestType[] = ["test", "fuzz", "fuzz2", "fuzz3", "fuzz4", "fuzz5", "fuzzWith", "todo"];

    return this.isTestFunctionNodeWithoutArgumentsOfType(testImportNodes, node, testTypes);
  }

  public isTestSuiteFunctionNodeWithoutArguments(testImportNodes: ElmImportNode[], node: ElmFunctionNode): boolean {
    const testSuiteTypes: ElmTestSuiteType[] = ["describe", "concat"];

    return this.isTestFunctionNodeWithoutArgumentsOfType(testImportNodes, node, testSuiteTypes);
  }

  public toDescriptionForTestModule(testModuleNode: TestModuleNode): string {
      const parts = testModuleNode.moduleNode.name.split(".");

      return parts[parts.length - 1];
  }

  public toSuiteNameForStructure(parentName: string, label: string): string {
    const name = parentName + label;

    if (name[0] === name[0].toLowerCase()) {
      return name;
    }

    return name[0].toLowerCase() + name.slice(1);
  }

  public toSuiteNameForTestModule(testModuleNode: TestModuleNode): string {
    return "all" + testModuleNode.moduleNode.name.replace(/\./g, "");
  }
}

export function createTestSuiteGenerator(): TestSuiteGenerator {
  return new TestSuiteGeneratorImp(createElmNodeHelper(), createLogger());
}
