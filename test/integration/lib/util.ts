"use strict";

import * as child from "child_process";
import * as path from "path";
import * as shelljs from "shelljs";
import {ExecOutputReturnValue} from "shelljs";

export class Util {

  public cd(absoluteOrRelativePath: string): void {
    if (absoluteOrRelativePath === "") {
      return;
    }

    const expectedPath = path.resolve(absoluteOrRelativePath);
    shelljs.cd(absoluteOrRelativePath);
    const actualPath = shelljs.pwd();

    if (actualPath.toString() !== expectedPath) {
      console.log(actualPath);
      console.log("[" + absoluteOrRelativePath + "]");
      throw new Error("cd failed for " + absoluteOrRelativePath + ". Current directory: " + actualPath);
    }
  }

  public copyElmJsonToTestDir(testDir): void {
    shelljs.cp("elm.json", testDir);
  }

  public execRaw(command: string, cwd: string): ExecOutputReturnValue | child.ChildProcess {
    const showExecution = process.env.noisyTestRun === "true";
    return shelljs.exec(command, {cwd, silent: !showExecution});
  }

  public clean(): void {
    this.rmFile("elm.json");
    this.rmDir("elm-stuff");
  }

  public cleanBuildArtifacts(): void {
    this.rmDir("elm-stuff/build-artifacts");
  }

  public cleanLobo(): void {
    this.rmDir(".lobo/elm-stuff");
    this.rmFile(".lobo/elm.json");
    this.rmDir(".lobo");
  }

  public initializeTestContext(dirName: string): string[] {
    let dir = dirName;
    const testContext = [];

    while (/test/.test(dir)) {
      testContext.push(path.basename(dir));
      dir = path.dirname(dir);
    }

    testContext.reverse();

    return testContext;
  }

  private rmFile(file: string): void {
    if (!shelljs.test("-e", file)) {
      return;
    }

    shelljs.rm(file);

    if (shelljs.test("-e", file)) {
      throw new Error("rm failed for " + file);
    }
  }

  private rmDir(filePath: string): void {
    if (!shelljs.test("-e", filePath)) {
      return;
    }

    shelljs.rm("-r", filePath);

    if (shelljs.test("-e", filePath)) {
      throw new Error("rm -r failed for " + filePath);
    }
  }
}
