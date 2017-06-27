import * as _ from "lodash";
import {ExecOutputReturnValue} from "shelljs";
import {Util} from "./util";

export class TestRunner {
  private util: Util = new Util();

  public clean(): void {
    if (process.env.disableClean) {
      return;
    }

    this.util.cd("tests");
    this.util.clean();
    this.util.cd("..");
  }

  public contextPush(context: string[], name: string): void {
    context.push(name);
    this.util.cd(name);
  }

  public contextPop(context: string[]): void {
    context.pop();
    this.util.cd("..");
  }

  public run(context: string[], framework: string, args?: string): ExecOutputReturnValue {
    let baseDir = _.repeat("../", context.length);
    let command = "node " + baseDir + "bin/lobo.js --prompt=no --verbose";

    if (framework) {
      command += " --framework=" + framework;
    }

    if (args) {
      command += " " + args;
    }

    return <ExecOutputReturnValue> this.util.execRaw(command);
  }
}
