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

    let expectedPath = path.resolve(absoluteOrRelativePath);
    shelljs.cd(absoluteOrRelativePath);
    let actualPath = shelljs.pwd();

    if (actualPath.toString() !== expectedPath) {
      console.log(actualPath);
      console.log("[" + absoluteOrRelativePath + "]");
      throw new Error("cd failed for " + absoluteOrRelativePath + ". Current directory: " + actualPath);
    }
  }

  public exec(command: string): void {
    if (shelljs.exec(command).code !== 0) {
      throw new Error("exec failed for " + command);
    }
  }

  public execRaw(command: string): ExecOutputReturnValue | child.ChildProcess {
    let showExecution = process.env.noisyTestRun === "true";
    return shelljs.exec(command, {silent: !showExecution});
  }

  public clean(): void {
    this.rmFile("elm-package.json");
    this.rmDir("elm-stuff");
  }

  public initializeTestContext(dirName: string): string[] {
    let dir = dirName;
    let testContext = [];

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

  private rmDir(path: string): void {
    if (!shelljs.test("-e", path)) {
      return;
    }

    shelljs.rm("-r", path);

    if (shelljs.test("-e", path)) {
      throw new Error("rm -r failed for " + path);
    }
  }
}