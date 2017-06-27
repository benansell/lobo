import * as bluebird from "bluebird";
import {createLogger, Logger} from "./logger";
import {createReporter, Reporter} from "./reporter";
import {ProgressReport, TestReportRoot} from "./plugin";
import {LoboConfig, Reject, Resolve} from "./main";

export interface Runner {
  run(config: LoboConfig): bluebird<object>;
}

export class RunnerImp {

  private logger: Logger;
  private reporter: Reporter;

  public static makeTestRunBegin(logger: Logger, reporter: Reporter, reject: Reject): (testCount: number) => void {
    return (testCount: number) => {
      try {
        logger.debug("Test run beginning", <{}>testCount);
        reporter.init(testCount);
      } catch (err) {
        reject(err);
      }
    };
  }

  public static makeTestRunProgress(logger: Logger, reporter: Reporter, reject: Reject):
  (result: ProgressReport) => void {
    return (result: ProgressReport) => {
      try {
        reporter.update(result);
        logger.trace("Test run progress", result);
      } catch (err) {
        reject(err);
      }
    };
  }

  public static makeTestRunComplete(logger: Logger, reporter: Reporter, resolve: Resolve, reject: Reject):
  (rawResults: TestReportRoot) => void {
    return (rawResults: TestReportRoot) => {
      try {
        logger.trace("Test run complete", rawResults);
        let result = reporter.finish(rawResults);

        if (result === true) {
          resolve();
        } else {
          reject();
        }
      } catch (err) {
        reject(err);
      }
    };
  }

  constructor(logger: Logger, reporter: Reporter) {
    this.logger = logger;
    this.reporter = reporter;
  }

  public run(config: LoboConfig): bluebird<object> {
    this.reporter.configure(config.reporter);
    let logger = this.logger;
    let reporter = this.reporter;

    return new bluebird((resolve: Resolve, reject: Reject) => {
      logger.info("-----------------------------------[ TEST ]-------------------------------------");

      // add to the global scope browser global properties that are used by elm imports
      (<{document: object}><{}>global).document = {}; // required by Dom
      (<{window: object}><{}>global).window = {}; // required by AnimationFrame

      // tslint:disable:no-require-imports
      let Elm = require(config.testFile);
      // tslint:enable:no-require-imports

      if (!Elm) {
        throw new Error("Elm program not found" + config.testFile);
      }

      let initArgs = config.testFramework.initArgs();
      logger.debug("Initializing Elm worker", initArgs);
      config.reporter.runArgs(initArgs);
      let app = Elm.UnitTest.worker(initArgs);

      logger.debug("Subscribing to ports");
      app.ports.begin.subscribe(RunnerImp.makeTestRunBegin(logger, reporter, reject));
      app.ports.end.subscribe(RunnerImp.makeTestRunComplete(logger, reporter, resolve, reject));
      app.ports.progress.subscribe(RunnerImp.makeTestRunProgress(logger, reporter, reject));

      logger.debug("Running tests");
      app.ports.runTests.send({
        reportProgress: config.reportProgress
      });
    });
  }
}

export function createRunner(): Runner {
  return new RunnerImp(createLogger(), createReporter());
}
