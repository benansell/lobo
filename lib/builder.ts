import * as Bluebird from "bluebird";
import {ExecutionContext, Reject, Resolve} from "./plugin";
import {createElmCommandRunner, ElmCommandRunner} from "./elm-command-runner";

export interface Builder {
  build(context: ExecutionContext): Bluebird<ExecutionContext>;
}

export class BuilderImp implements Builder {

 private readonly elmCommand: ElmCommandRunner;

  constructor(elmCommand: ElmCommandRunner) {
    this.elmCommand = elmCommand;
  }

  public build(context: ExecutionContext): Bluebird<ExecutionContext> {
    return new Bluebird<ExecutionContext>((resolve: Resolve<ExecutionContext>, reject: Reject) => {
      this.elmCommand.make(context.config, context.config.prompt, context.hasDebugUsage, context.testSuiteOutputFilePath,
                           context.buildOutputFilePath, () => resolve(context), reject);
    });
  }
}

export function createBuilder(): Builder {
  return new BuilderImp(createElmCommandRunner());
}
