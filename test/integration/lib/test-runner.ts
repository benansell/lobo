import * as path from "path";
import * as _ from "lodash";
import {ExecOutputReturnValue} from "shelljs";
import {Util} from "./util";

export class TestRunner {
  private util: Util = new Util();

  public clean(): void {
    if (process.env.disableClean) {
      return;
    }

    this.util.cleanLobo();
    this.util.cd("tests");
    this.util.clean();
    this.util.cd("..");
  }

  public cleanLoboAndBuildArtifacts(): void {
    this.util.cleanLobo();
    this.util.cd("tests");
    this.util.cleanBuildArtifacts();
    this.util.cd("..");
  }

  public run(context: string[], framework: string, testDir?: string, args?: string): ExecOutputReturnValue {
    const baseDir = _.repeat("../", context.length);
    const rootDir = !testDir ? baseDir : path.relative(testDir, baseDir);
    let command = `node ${rootDir}/bin/lobo.js --prompt=no --verbose`;

    if (framework) {
      command += " --framework=" + framework;
    }

    if (testDir) {
      this.util.copyElmJsonToTestDir(testDir);
      command += " --testDirectory=.";
    }

    if (args) {
      command += " " + args;
    }

    const cwd = !testDir ? "." : testDir;

    return <ExecOutputReturnValue> this.util.execRaw(command, cwd);
  }
}
