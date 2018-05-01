import * as Bluebird from "bluebird";
import {
  ElmCodeInfo,
  ElmCodeLookup,
  ElmFunctionNode,
  ElmImportNode,
  ElmModuleNode,
  ElmNode,
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

  public findTestFunctions(nodes: ElmNode[], testImportNodes: ElmImportNode[]): ElmFunctionNode[] {
    const result: ElmFunctionNode[] = [];

    for (const n of nodes) {
      if (this.elmNodeHelper.isFunctionNode(n)) {
        if (this.isTestSuiteFunctionNode(testImportNodes, n) || this.isTestFunctionNode(testImportNodes, n)) {
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

    const rootTestSuite = this.generateTestSuiteRoot(indent, testModuleNodes);
    lines.push(...rootTestSuite);

    for (let i = 0; i < testModuleNodes.length; i++) {
      const tm = testModuleNodes[i];
      const testModuleLines = this.generateTestSuiteForModule(indent, tm);
      lines.push(...testModuleLines);
    }

    return lines.join(os.EOL);
  }

  public generateTestSuiteRoot(indent: string, testModuleNodes: TestModuleNode[]): string[] {
    const lines: string[] = [];
    lines.push("");
    lines.push("");
    lines.push("all : Test");
    lines.push("all =");
    lines.push(indent + "describe \"Unit Tests\"");

    if (testModuleNodes.length === 0) {
      lines.push(`${indent}${indent}[]`);
    } else {
      const firstTestIndent = indent + indent + "[ ";
      const restTestIndent = indent + indent + ", ";

      for (let i = 0; i < testModuleNodes.length; i++) {
        const tm = testModuleNodes[i];
        let prefix = i === 0 ? firstTestIndent : restTestIndent;
        lines.push(`${prefix}all${this.toSuiteName(tm)}`);
      }

      lines.push(indent + indent + "]");
    }

    return lines;
  }

  public generateTestSuiteForModule(indent: string, testModuleNode: TestModuleNode): string[] {
    const lines: string[] = [];
    const alias = this.toSuiteName(testModuleNode);
    lines.push("");
    lines.push("");
    lines.push("all" + alias + " : Test");
    lines.push("all" + alias + " =");
    lines.push(`${indent}describe "${testModuleNode.moduleNode.name}"`);

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

    return lines;
  }

  public isTestFunctionNode(testImportNodes: ElmImportNode[], node: ElmFunctionNode): boolean {
    for (const importNode of testImportNodes) {
      for (const d of node.dependencies) {
        if (d.moduleName === importNode.name && (d.name === "test" || d.name === "fuzz")) {
          return true;
        }
      }
    }

    return false;
  }

  public isTestSuiteFunctionNode(testImportNodes: ElmImportNode[], node: ElmFunctionNode): boolean {
    for (const importNode of testImportNodes) {
      for (const d of node.dependencies) {
        if (d.moduleName === importNode.name && (d.name === "describe" || d.name === "concat")) {
          return true;
        }
      }
    }

    return false;
  }

  public toSuiteName(testModuleNode: TestModuleNode): string {
    return testModuleNode.moduleNode.name.replace(/\./g, "");
  }
}

export function createTestSuiteGenerator(): TestSuiteGenerator {
  return new TestSuiteGeneratorImp(createElmNodeHelper(), createLogger());
}
