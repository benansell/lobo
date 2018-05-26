import * as Bluebird from "bluebird";

export interface CodeLocation {
  columnNumber: number;
  lineNumber: number;
}

export interface Dependencies {
  [index: string]: string;
}

export interface ElmCodeLookup {
  [key: string]: ElmCodeInfo;
}

export interface ElmCodeInfo {
  fileName: string;
  filePath: string;
  isMainTestFile: boolean;
  isTestFile: boolean;
  lastModified: Date;
  moduleNode: ElmModuleNode | undefined;
}

export type ElmNode = ElmImportNode
  | ElmPortNode
  | ElmTypeNode
  | ElmTypeAliasNode
  | ElmTypedModuleFunctionNode
  | ElmUntypedModuleFunctionNode;

export type ElmFunctionNode = ElmTypedModuleFunctionNode | ElmUntypedModuleFunctionNode;

export enum ElmNodeType {
  Import = 0,
  Module,
  Port,
  Type,
  TypeAlias,
  TypedModuleFunction,
  UntypedModuleFunction,
  Unknown
}

export interface BaseElmNode {
  code: string;
  end: CodeLocation;
  name: string;
  nodeType: ElmNodeType;
  start: CodeLocation;
}

export interface ElmFunctionDependency {
  occurs: number[];
  typeInfo: ElmTypeInfo;
}

export interface ElmImportNode extends BaseElmNode {
  alias?: string;
  exposing: ElmTypeInfo[];
}

export interface ElmModuleNode extends BaseElmNode {
  children: ElmNode[];
  exposing: ElmTypeInfo[];
}

export interface ElmPortNode extends BaseElmNode {
}

export interface ElmTypeNode extends BaseElmNode {
  dependencies: ElmTypeInfo[];
}

export interface ElmTypeAliasNode extends BaseElmNode {
}

export interface ElmTypedModuleFunctionNode extends BaseElmNode {
  arguments: string[];
  dependencies: ElmFunctionDependency[];
  returnType: ElmTypeInfo;
}

export interface ElmUntypedModuleFunctionNode extends BaseElmNode {
  arguments: string[];
  dependencies: ElmFunctionDependency[];
}

export interface ElmTypeInfo {
  name: string;
  parentTypeName?: string;
  moduleName: string;
}

export interface ExecutionContext {
  buildOutputFilePath: string;
  codeLookup: ElmCodeLookup;
  config: LoboConfig;
  testDirectory: string;
  testFile: string;
  testSuiteOutputFilePath: string;
}

export interface FailureMessage {
  readonly given?: string;
  readonly message: string;
}

export interface LoboConfig {
  readonly compiler: string;
  readonly loboDirectory: string;
  readonly noInstall: boolean;
  readonly noUpdate: boolean;
  readonly noWarn: boolean;
  readonly prompt: boolean;
  readonly reportProgress: boolean;
  readonly reporter: PluginReporter;
  readonly testFramework: PluginTestFrameworkWithConfig;
  readonly testMainElm: string;
}

export interface PluginConfig {
  readonly name: string;
  readonly options: PluginOption[];
}

export interface PluginTestFramework {
  initArgs(): RunArgs;
  pluginElmModuleName(): string;
  testFrameworkElmModuleName(): string;
}

export interface PluginTestFrameworkConfig extends PluginConfig {
  readonly sourceDirectories: string[];
  readonly dependencies: Dependencies;
}

export type PluginOptionValue = boolean | object | number | string;

export interface PluginOption {
  readonly defaultValue?: PluginOptionValue;
  readonly description: string;
  readonly flags: string;
  readonly parser?: RegExp
    | ((arg1: string) => PluginOptionValue)
    | ((arg1: string, arg2: string) => PluginOptionValue);
}

export interface PluginReporter {
  init(testCount: number): void;
  finish(results: TestRun): Bluebird<void>;
  runArgs(args: RunArgs): void;
  update(result: ProgressReport): void;
}

export interface PluginReporterLogger {
  log(message: string): void;
}

export interface PluginReporterWithConfig extends PluginReporter {
  readonly config: PluginConfig;
}

export interface PluginTestFrameworkWithConfig extends PluginTestFramework {
  readonly config: PluginTestFrameworkConfig;
}

export type ProgressReport =
  TestReportFailedLeaf
  | TestReportIgnoredLeaf
  | TestReportPassedLeaf
  | TestReportSkippedLeaf
  | TestReportTodoLeaf;

export type Reject = (reason?: Error) => void;

export type Resolve<T> = (data?: T) => void;

export type ResultType =
  "FAILED"
  | "IGNORED"
  | "PASSED"
  | "SKIPPED"
  | "TODO";

export interface RunArgs {
  readonly runCount: number;
  readonly seed: number;
}

export type RunType =
  "FOCUS"
  | "NORMAL"
  | "SKIP";


export interface TestArgs {
  readonly seed: number;
  readonly testCount: number;
}

export interface TestReportNode {
  readonly id: number;
  readonly label: string;
  readonly resultType: ResultType;
}

export interface TestReportLogged {
  readonly logMessages: string[];
}

export interface TestReportTimed {
  readonly startTime: number;
  readonly endTime: number;
}

export interface TestReportConfig {
  readonly framework: string;
  readonly initialSeed: number;
  readonly runCount: number;
}

export interface TestReportFailedLeaf extends TestReportNode, TestReportLogged, TestReportTimed {
    readonly resultMessages: FailureMessage[];
}

export interface TestReportIgnoredLeaf extends TestReportNode {
}

export interface TestReportPassedLeaf extends TestReportNode, TestReportLogged, TestReportTimed {
  readonly logMessages: string[];
}

export interface TestReportSkippedLeaf extends TestReportNode {
  readonly reason: string;
}

export interface TestReportRoot {
  readonly runType: RunType;
  readonly config: TestReportConfig;
  readonly runResults: TestReportNode[];
  readonly startTime: number;
  readonly endTime: number;
}

export interface TestReportSuiteNode extends TestReportNode {
  readonly endTime?: number;
  readonly results: TestReportNode[];
  readonly startTime?: number;
}

export interface TestReportTodoLeaf extends TestReportNode, TestReportTimed {
}

export interface TestResultDecorator {
  bulletPoint(): string;
  debugLog(value: string): string;
  diff(value: string): string;
  expect(value: string): string;
  failed(value: string): string;
  line(line: string): string;
  given(value: string): string;
  inconclusive(value: string): string;
  only(value: string): string;
  passed(value: string): string;
  rightArrow(): string;
  skip(value: string): string;
  todo(value: string): string;
  verticalBarEnd(): string;
  verticalBarMiddle(): string;
  verticalBarStart(): string;
}

export interface TestRun {
  readonly failState: TestRunFailState;
  readonly summary: TestRunSummary;
}

export interface TestRunFailState {
  readonly only: TestRunState;
  readonly skip: TestRunState;
  readonly todo: TestRunState;
}

export interface TestRunState {
  readonly isFailOn: boolean;
  readonly exists: boolean;
  readonly isFailure: boolean;
}

export interface TestRunSummary {
  readonly config: TestReportConfig;
  readonly durationMilliseconds: number | undefined;
  readonly endDateTime: Date | undefined;
  readonly failedCount: number;
  readonly failures: TestRunLeaf<TestReportFailedLeaf>[];
  readonly onlyCount: number;
  readonly outcome: string;
  readonly passedCount: number;
  readonly runResults: TestReportNode[];
  readonly runType: RunType;
  readonly skipped: TestRunLeaf<TestReportSkippedLeaf>[];
  readonly skippedCount: number;
  readonly startDateTime: Date | undefined;
  readonly success: boolean;
  readonly successes: TestRunLeaf<TestReportPassedLeaf>[];
  readonly todo: TestRunLeaf<TestReportTodoLeaf>[];
  readonly todoCount: number;
}

export interface TestRunLeaf<T> {
  readonly labels: string[];
  readonly result: T;
}
