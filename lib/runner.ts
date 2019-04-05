import * as Bluebird from "bluebird";
import {createLogger, Logger} from "./logger";
import {createReporter, Reporter} from "./reporter";
import {ExecutionContext, ProgressReport, Reject, Resolve, RunArgs, TestReportRoot} from "./plugin";

export interface LoboElmApp {
  ports: {
    begin: { subscribe: (args: (testCount: number) => void) => void },
    end: { subscribe: (args: (rawResults: TestReportRoot) => void) => void },
    progress: { subscribe: (args: (result: ProgressReport) => void) => void },
    runNextTest: { send: (args: boolean) => void },
    startTestRun: { send: (args: { reportProgress: boolean }) => void }
  };
}

export interface ElmTestApp {
  Elm: { UnitTest: { init: (flags: {flags: RunArgs}) => LoboElmApp } };
}

export interface Runner {
  run(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export type NodeProcessWrite = (str: string, encoding?: string, cb?: Function) => boolean;

export interface NodeProcessStdout {
  write: NodeProcessWrite;
}

export interface BrowserGlobal extends NodeJS.Global {
  document: { // required by Dom & Navigation
    location: { // required by Navigation & UrlParser
      hash: string,
      pathname: string,
      search: string
    }
  };
  window: { // required by AnimationFrame & Navigation
    navigator: object // required by Navigation
  };
}

export class RunnerImp {

  public static originalNodeProcessWrite: NodeProcessWrite;
  public static debugLogMessages: string[];

  private readonly logger: Logger;
  private readonly reporter: Reporter;

  public static makeTestRunBegin(stdout: NodeProcessStdout, logger: Logger, reporter: Reporter, reject: Reject):
  (testCount: number) => void {
    return (testCount: number) => {
      try {
        logger.debug("Test run beginning", testCount.toString());
        reporter.init(testCount);
        RunnerImp.originalNodeProcessWrite = stdout.write;
        stdout.write = RunnerImp.testRunStdOutWrite;
        RunnerImp.debugLogMessages = [];
      } catch (err) {
        stdout.write = RunnerImp.originalNodeProcessWrite;
        reject(err);
      }
    };
  }

  public static makeTestRunProgress(stdout: NodeProcessStdout, logger: Logger, reporter: Reporter, runNextTest: () => void, reject: Reject):
  (result: ProgressReport) => void {
    return (result: ProgressReport) => {
      try {
        stdout.write = RunnerImp.originalNodeProcessWrite;
        reporter.update(result, RunnerImp.debugLogMessages);
        logger.trace("Test run progress", { result: result, debugLogMessages: RunnerImp.debugLogMessages});
        stdout.write = RunnerImp.testRunStdOutWrite;
        RunnerImp.debugLogMessages = [];
        runNextTest();
      } catch (err) {
        stdout.write = RunnerImp.originalNodeProcessWrite;
        reject(err);
      }
    };
  }

  public static makeTestRunComplete(stdout: NodeProcessStdout, logger: Logger, context: ExecutionContext, reporter: Reporter,
                                    resolve: Resolve<ExecutionContext>, reject: Reject):
  (rawResults: TestReportRoot) => void {
    return (rawResults: TestReportRoot) => {
      stdout.write = RunnerImp.originalNodeProcessWrite;
      logger.trace("Test run complete", rawResults);
      reporter.finish(rawResults)
        .then(() => resolve(context))
        .catch((err) => {
          stdout.write = RunnerImp.originalNodeProcessWrite;
          reject(err);
        });
    };
  }

  public static testRunStdOutWrite(str: string): boolean {
    RunnerImp.debugLogMessages.push(str);

    return true;
  }

  constructor(logger: Logger, reporter: Reporter) {
    this.logger = logger;
    this.reporter = reporter;
  }

  public loadElmTestApp(testFile: string, logger: Logger): ElmTestApp {
    let app: ElmTestApp;

    try {
      // tslint:disable:no-require-imports
      app = require(testFile);
      // tslint:enable:no-require-imports
    } catch (err) {
      logger.debug("Failed to require test file", testFile);
      throw err;
    }

    return app;
  }

  public run(context: ExecutionContext): Bluebird<ExecutionContext> {
    this.reporter.configure(context.config.reporter);
    const logger = this.logger;
    const reporter = this.reporter;

    return new Bluebird((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      // add to the global scope browser global properties that are used by elm imports
      (<BrowserGlobal>global).document = { location: { hash: "", pathname: "", search: "" } };
      (<BrowserGlobal>global).window = { navigator: {} };

      const elmApp = this.loadElmTestApp(context.buildOutputFilePath, logger);
      const initArgs = context.config.testFramework.initArgs();
      logger.debug("Initializing Elm worker", initArgs);
      context.config.reporter.runArgs(initArgs);
      const app = elmApp.Elm.UnitTest.init({flags: initArgs});
      const runNextTest = () => setImmediate(() => app.ports.runNextTest.send(true));

      logger.debug("Subscribing to ports");
      app.ports.begin.subscribe(RunnerImp.makeTestRunBegin(process.stdout, logger, reporter, reject));
      app.ports.end.subscribe(RunnerImp.makeTestRunComplete(process.stdout, logger, context, reporter, resolve, reject));
      app.ports.progress.subscribe(RunnerImp.makeTestRunProgress(process.stdout, logger, reporter, runNextTest, reject));

      logger.debug("Running tests");
      app.ports.startTestRun.send({
        reportProgress: context.config.reportProgress
      });

      runNextTest();
    });
  }
}

export function createRunner(): Runner {
  return new RunnerImp(createLogger(), createReporter());
}
