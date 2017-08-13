import * as program from "commander";
import * as plugin from "./plugin";

export class TestResultDecoratorHtmlImp implements plugin.TestResultDecorator {

  public only: (value: string) => string;
  public skip: (value: string) => string;
  public todo: (value: string) => string;

  public constructor() {
    this.only = program.failOnOnly ? this.failed : this.inconclusive;
    this.skip = program.failOnSkip ? this.failed : this.inconclusive;
    this.todo = program.failOnTodo ? this.failed : this.inconclusive;
  }

  public bulletPoint(): string {
    return "&bullet;";
  }

  public diff(value: string): string {
    return `<span style="color:red">${value}</span>`;
  }

  public expect(value: string): string {
    return `<span style="color:goldenrod">${value}</span>`;
  }

  public failed(value: string): string {
    return `<span style="color:red">${value}</span>`;
  }

  public line(line: string): string {
   return `<span>${line}</span>`;
  }

  public given(value: string): string {
    return `<span style="color:goldenrod">${value}</span>`;
  }

  public inconclusive(value: string): string {
    return `<span style="color:goldenrod">${value}</span>`;
  }

  public passed(value: string): string {
    return `<span style="color:green">${value}</span>`;
  }

  public verticalBarEnd(): string {
    return "&boxur;";
  }

  public verticalBarMiddle(): string {
    return "&boxv;";
  }

  public verticalBarStart(): string {
    return "&boxdr;";
  }
}

export function createTestResultDecoratorHtml(): plugin.TestResultDecorator {
  return new TestResultDecoratorHtmlImp();
}

