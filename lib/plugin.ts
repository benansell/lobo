export interface Dependencies {
  [index: string]: string;
}

export interface FailureMessage {
  readonly given?: string;
  readonly message: string;
}

export interface PluginConfig {
  readonly name: string;
  readonly options: PluginOption[];
}

export interface PluginTestFramework {
  initArgs(): RunArgs;
}

export interface PluginTestFrameworkConfig extends PluginConfig {
  readonly sourceDirectories: string[];
  readonly dependencies: Dependencies;
}

export interface PluginOption {
  readonly flags: string;
  readonly description: string;
}

export interface PluginReporter {
  init(testCount: number): void;
  finish(results: TestRun): void;
  runArgs(args: RunArgs): void;
  update(result: ProgressReport): void;
}

export type ProgressReport =
  TestReportFailedLeaf
  | TestReportIgnoredLeaf
  | TestReportPassedLeaf
  | TestReportSkippedLeaf
  | TestReportTodoLeaf;

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
  readonly label: string;
  readonly resultType: ResultType;
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

export interface TestReportFailedLeaf extends TestReportNode, TestReportTimed {
  readonly resultMessages: FailureMessage[];
}

export interface TestReportIgnoredLeaf extends TestReportNode {
}

export interface TestReportPassedLeaf extends TestReportNode, TestReportTimed {
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
  readonly todo: TestRunLeaf<TestReportTodoLeaf>[];
  readonly todoCount: number;
}

export interface TestRunLeaf<T> {
  readonly labels: string[];
  readonly result: T;
}