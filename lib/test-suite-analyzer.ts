import {
  ElmCodeInfo, ElmCodeLookup,
  ElmFunctionNode,
  ElmImportNode,
  ElmModuleNode,
  ElmNode, ElmTestSuiteType, ElmTestType,
  ElmTypeInfo,
  ExecutionContext
} from "./plugin";
import {createElmNodeHelper, ElmNodeHelper} from "./elm-node-helper";

export interface IndirectlyExposedInfo {
  codeInfoKey: string;
  functionNode: AnalyzedTestFunctionNode;
  occurs: number[];
}

export interface AnalyzedFunctionDependency {
  functionNode: AnalyzedTestFunctionNode;
  moduleNode: AnalyzedTestModuleNode;
}

export interface AnalyzedTestModuleNode {
  analyzed: boolean;
  codeInfoKey: string;
  filePath: string;
  moduleNode: ElmModuleNode | undefined;
  tests: AnalyzedTestFunctionNode[];
}

export interface AnalyzedTestFunctionNode {
  codeInfoModuleKey: string;
  isExposedDirectly: boolean;
  isExposedIndirectlyBy: IndirectlyExposedInfo[];
  suiteType?: ElmTestSuiteType;
  testType?: ElmTestType;
  moduleName: string;
  node: ElmFunctionNode;
}

export interface AnalysisTestSummary {
  analysisFailureCount: number;
  analysisFailures: string[];
  hiddenTestCount: number;
  hiddenTests: AnalyzedTestFunctionNode[];
  overExposedTestCount: number;
  overExposedTests: AnalyzedTestFunctionNode[];
}

export interface TestSuiteAnalyzer {
  buildSummary(context: ExecutionContext): AnalysisTestSummary;
}

export class TestSuiteAnalyzerImp implements TestSuiteAnalyzer {

  private readonly elmNodeHelper: ElmNodeHelper;

  constructor(elmNodeHelper: ElmNodeHelper) {
    this.elmNodeHelper = elmNodeHelper;
  }

  public buildAnalyzedModuleNodes(codeLookup: ElmCodeLookup, testFrameworkElmModuleName: string): AnalyzedTestModuleNode[] {
    const results: AnalyzedTestModuleNode[] = [];

    for (const key in codeLookup) {
      if (codeLookup.hasOwnProperty(key)) {
        const codeInfo: ElmCodeInfo = codeLookup[key];

        if (codeInfo && codeInfo.isTestFile) {
          if (codeInfo.moduleNode) {
            const moduleNode = codeInfo.moduleNode;
            const testImportNodes = this.findImportNodesForModuleName(testFrameworkElmModuleName, moduleNode.children);
            const tests = this.buildAnalyzedFunctionNodes(key, moduleNode, testImportNodes);
            results.push({
              analyzed: true,
              codeInfoKey: key,
              filePath: codeInfo.filePath,
              moduleNode,
              tests
            });
          } else {
            results.push({
              analyzed: false,
              codeInfoKey: key,
              filePath: codeInfo.filePath,
              moduleNode: undefined,
              tests: []
            });
          }
        }
      }
    }

    return results;
  }

  public buildAnalyzedFunctionNodes(codeInfoKey: string, moduleNode: ElmModuleNode, testImportNodes: ElmImportNode[])
    : AnalyzedTestFunctionNode[] {
    const tests: AnalyzedTestFunctionNode[] = [];

    for (const child of moduleNode.children) {
      if (!this.elmNodeHelper.isFunctionNode(child)) {
        continue;
      }

      const suiteType = this.findTestSuiteTypeFunctionNode(testImportNodes, child);
      const testType = this.findTestTypeOfFunctionNode(testImportNodes, child);

      if (suiteType !== undefined || testType !== undefined) {
        const item = <AnalyzedTestFunctionNode> {
          codeInfoModuleKey: codeInfoKey,
          isExposedDirectly: this.isFunctionNodeExposed(moduleNode.exposing, child),
          isExposedIndirectlyBy: [],
          moduleName: moduleNode.name,
          node: child,
          suiteType,
          testType
        };
        tests.push(item);
      }
    }

    return tests;
  }

  public buildSummary(context: ExecutionContext): AnalysisTestSummary {
    const testFrameworkElmModuleName = context.config.testFramework.testFrameworkElmModuleName();
    const results = this.buildAnalyzedModuleNodes(context.codeLookup, testFrameworkElmModuleName);
    this.updateExposedIndirectly(results);

    return this.toAnalysisTestSummary(results);
  }

  public findAnalyzedFunctionNodeInModulesForDependency(nodes: AnalyzedTestModuleNode[], dependency: ElmTypeInfo)
    : AnalyzedFunctionDependency | undefined {
    for (const mn of nodes) {
      if (mn.moduleNode && dependency.moduleName !== mn.moduleNode.name) {
        continue;
      }

      const functionNode = this.findAnalyzedFunctionNodeForDependency(mn.tests, dependency);

      if (functionNode) {
        return {functionNode, moduleNode: mn};
      }
    }

    return undefined;
  }

  public findAnalyzedFunctionNodeForDependency(functionNodes: AnalyzedTestFunctionNode[], dependency: ElmTypeInfo)
    : AnalyzedTestFunctionNode | undefined {

    for (const n of functionNodes) {
      if (n.node.name === dependency.name) {
        return n;
      }
    }

    return undefined;
  }

  public findImportNodesForModuleName(moduleName: string, nodes: ElmNode[]): ElmImportNode[] {
    const importNodes: ElmImportNode[] = [];

    for (const node of nodes) {
      if (this.elmNodeHelper.isImportNode(node)) {
        if (node.name === moduleName) {
          importNodes.push(node);
        }
      }
    }

    return importNodes;
  }

  public findTestTypeOfFunctionNodeForTestType<T extends string>(testImportNodes: ElmImportNode[], node: ElmFunctionNode,
                                                                 testTypes: T[]): T | undefined {
    for (const importNode of testImportNodes) {
      for (const d of node.dependencies) {
        const ti = d.typeInfo;

        if (ti.moduleName === importNode.name) {
          const index = testTypes.indexOf(<T> ti.name);

          if (index > -1) {
            return testTypes[index];
          }
        }
      }
    }

    return undefined;
  }

  public findTestSuiteTypeFunctionNode(testImportNodes: ElmImportNode[], node: ElmFunctionNode): ElmTestSuiteType | undefined {
    const testSuiteTypes: ElmTestSuiteType[] = ["describe", "concat"];

    return this.findTestTypeOfFunctionNodeForTestType(testImportNodes, node, testSuiteTypes);
  }

  public findTestTypeOfFunctionNode(testImportNodes: ElmImportNode[], node: ElmFunctionNode): ElmTestType | undefined {
    const testTypes: ElmTestType[] = ["test", "fuzz", "fuzz2", "fuzz3", "fuzz4", "fuzz5", "fuzzWith", "todo"];

    return this.findTestTypeOfFunctionNodeForTestType(testImportNodes, node, testTypes);
  }

  public isFunctionNodeExposed(exposing: ElmTypeInfo[], node: ElmFunctionNode): boolean {
    for (const t of exposing) {
      if (t.name === node.name) {
        return true;
      }
    }

    return false;
  }

  public isHidden(functionNode: AnalyzedTestFunctionNode): boolean {
    if (functionNode.node.arguments.length > 0) {
      return false;
    }

    if (functionNode.isExposedDirectly) {
      return false;
    }

    return functionNode.isExposedIndirectlyBy.length === 0;
  }

  public isOverExposed(functionNode: AnalyzedTestFunctionNode): boolean {
    if (functionNode.node.arguments.length > 0) {
      return false;
    }

    if (functionNode.isExposedDirectly) {
      return functionNode.isExposedIndirectlyBy.length !== 0;
    }

    let exposedCount = 0;

    for (const item of functionNode.isExposedIndirectlyBy) {
      exposedCount += item.occurs.length;

      if (exposedCount > 1) {
        return true;
      }
    }

    return false;
  }

  public toAnalysisTestSummary(moduleNodes: AnalyzedTestModuleNode[]): AnalysisTestSummary {
    const result = <AnalysisTestSummary> {
      analysisFailureCount: 0,
      analysisFailures: [],
      hiddenTestCount: 0,
      hiddenTests: [],
      overExposedTestCount: 0,
      overExposedTests: []
    };

    for (const mn of moduleNodes) {
      if (!mn.analyzed) {
        result.analysisFailures.push(mn.codeInfoKey);
        result.analysisFailureCount++;
        continue;
      }

      for (const t of mn.tests) {
        if (this.isHidden(t)) {
          result.hiddenTests.push(t);
          result.hiddenTestCount++;
        } else if (this.isOverExposed(t)) {
          result.overExposedTests.push(t);
          result.overExposedTestCount++;
        }
      }
    }

    return result;
  }

  public updateExposedIndirectly(nodes: AnalyzedTestModuleNode[]): void {
    for (const n of nodes) {
      for (const t of n.tests) {
        this.updateExposedIndirectlyForFunctionNode(nodes, n, t);
      }
    }
  }

  public updateExposedIndirectlyForFunctionNode(nodes: AnalyzedTestModuleNode[], moduleNode: AnalyzedTestModuleNode,
                                                testFunctionNode: AnalyzedTestFunctionNode): void {
    const isExisting =
      (x: IndirectlyExposedInfo) => x.codeInfoKey === moduleNode.codeInfoKey && x.functionNode.node === testFunctionNode.node;

    for (const d of testFunctionNode.node.dependencies) {
      const dep = this.findAnalyzedFunctionNodeInModulesForDependency(nodes, d.typeInfo);

      if (!dep) {
        continue;
      }

      if (dep.functionNode.isExposedIndirectlyBy.filter(isExisting).length === 0) {
        const exposedBy = {codeInfoKey: moduleNode.codeInfoKey, functionNode: testFunctionNode, occurs: d.occurs};
        dep.functionNode.isExposedIndirectlyBy.push(exposedBy);
        this.updateExposedIndirectlyForFunctionNode(nodes, dep.moduleNode, dep.functionNode);
      }
    }
  }
}

export function createTestSuiteAnalyzer(): TestSuiteAnalyzer {
  return new TestSuiteAnalyzerImp(createElmNodeHelper());
}
