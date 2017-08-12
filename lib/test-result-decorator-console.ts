import * as Chalk from "chalk";
import * as program from "commander";
import * as plugin from "./plugin";

export class TestResultDecoratorConsoleImp implements plugin.TestResultDecorator {

  public only: (value: string) => string;
  public skip: (value: string) => string;
  public todo: (value: string) => string;

  public constructor() {
    this.only = program.failOnOnly ? this.failed : this.inconclusive;
    this.skip = program.failOnSkip ? this.failed : this.inconclusive;
    this.todo = program.failOnTodo ? this.failed : this.inconclusive;
  }

  public bulletPoint(): string {
    return "•";
  }

  public diff(value: string): string {
    return Chalk.red(value);
  }

  public expect(value: string): string {
    return Chalk.yellow(value);
  }

  public failed(value: string): string {
    return Chalk.red(value);
  }

  public line(line: string): string {
    return line;
  }

  public given(value: string): string {
    return Chalk.yellow(value);
  }

  public inconclusive(value: string): string {
    return Chalk.yellow(value);
  }

  public passed(value: string): string {
    return Chalk.green(value);
  }

  public verticalBarEnd(): string {
    return "└";
  }

  public verticalBarMiddle(): string {
    return "│";
  }

  public verticalBarStart(): string {
    return "┌";
  }
}

export function createTestResultDecoratorConsole(): plugin.TestResultDecorator {
  return new TestResultDecoratorConsoleImp();
}
