import * as _ from "lodash";
import * as os from "os";
import {Comparer, createComparer} from "./comparer";
import * as plugin from "./plugin";
import {createTestResultDecoratorConsole} from "./test-result-decorator-console";

export interface TestResultFormatter {
  defaultIndentation: string;
  formatFailure(item: plugin.TestRunLeaf<plugin.TestReportFailedLeaf>, padding: string): string;
  formatNotRun(item: plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>, padding: string): string;
  formatUpdate(item: plugin.ProgressReport): string;
}

export class TestResultFormatterImp implements TestResultFormatter {
  public defaultIndentation: string = "  ";

  private comparer: Comparer;
  private decorator: plugin.TestResultDecorator;

  public constructor(comparer: Comparer, decorator: plugin.TestResultDecorator) {
    this.comparer = comparer;
    this.decorator = decorator;
  }

  public formatFailure(item: plugin.TestRunLeaf<plugin.TestReportFailedLeaf>, padding: string): string {
    let stdout = <{ columns: number }><{}>process.stdout;

    // default to a width of 80 when process is not running in a terminal
    let maxLength = stdout && stdout.columns ? stdout.columns - padding.length : 80;
    let lines: string[] = [];

    _.forEach(item.result.resultMessages, (resultMessage: plugin.FailureMessage) => {
      if (resultMessage.given && resultMessage.given.length > 0) {
        lines.push(`${os.EOL}${this.defaultIndentation}${this.defaultIndentation}• ${this.decorator.given("Given")}`);
        let givenMessage = this.formatMessage(this.defaultIndentation + resultMessage.given, padding);
        lines.push(`${os.EOL}${givenMessage}${os.EOL}`);
      }

      let message = this.formatFailureMessage(resultMessage.message, maxLength);
      lines.push(`${os.EOL}${this.formatMessage(message, padding)}${os.EOL}`);
    });

    return lines.join("");
  }

  public formatNotRun(item: plugin.TestRunLeaf<plugin.TestReportSkippedLeaf>, padding: string): string {
    let message = this.formatMessage(item.result.reason, padding);

    return `${os.EOL}${this.defaultIndentation}${message}${os.EOL}`;
  }

  public formatFailureMessage(message: string, maxLength: number): string {
    if (message.indexOf("│") === -1) {
      return message.replace(message, "\n  " + this.decorator.expect(message) + "\n");
    }

    let lines = message.split("\n");

    // remove diff lines
    let diffRegex = /Expect.equal(Dicts|Lists|Sets)/;

    if (lines.length > 5 && diffRegex.test(lines[2])) {
      lines.splice(5, lines.length - 5);
    }

    if (lines.length !== 5) {
      return message;
    }

    if (lines[2].indexOf("│ ") !== -1) {
      lines[0] = "┌ " + lines[0];
      lines[1] = lines[1].replace("╷", "│");
      lines[3] = lines[3].replace("╵", "│");
      lines[4] = "└ " + lines[4];

      let expectMessage = lines[2].substring(2, lines[2].length);
      lines[2] = lines[2].replace(expectMessage, this.decorator.expect(expectMessage));
    }

    let expectEqualRegex = /Expect.equal(Dicts|Lists|Sets)*/;

    if (expectEqualRegex.test(lines[2])) {
      lines = this.formatExpectEqualFailure(lines, maxLength);
    }

    return lines.join("\n");
  }

  public formatExpectEqualFailure(unprocessedLines: string[], maxLength: number): string[] {
    let lines: Array<string | string[]> = _.clone(unprocessedLines);
    lines.push("   ");

    // remove "┌ " and "└ "
    let left = (<string>lines[0]).substring(2);
    let right = (<string>lines[4]).substring(2);
    let value = this.comparer.diff(left, right);
    lines[1] = "│ " + value.left;
    lines[5] = "  " + value.right;

    lines[0] = this.chunkLine(<string>lines[0], <string>lines[1], maxLength, "┌ ", "│ ");
    lines[1] = "";

    lines[4] = this.chunkLine(<string>lines[4], <string>lines[5], maxLength, "└ ", "  ");
    lines[5] = "";

    return <string[]> _.flattenDepth(lines, 1);
  }

  public chunkLine(rawContentLine: string, rawDiffLine: string, length: number, firstPrefix: string, prefix: string): string[] {
    let contentLine = rawContentLine.substring(firstPrefix.length - 1);
    let diffLine = rawDiffLine.substring(firstPrefix.length - 1);
    let size = Math.ceil(contentLine.length / length);
    let chunks = new Array(size * 2);
    let offset;
    let sectionLength = length - prefix.length - 1;

    chunks[0] = firstPrefix + contentLine.substring(1, sectionLength + 1);
    chunks[1] = prefix + this.decorator.diff(diffLine.substring(1, sectionLength + 1));

    for (let i = 1; i < size; i++) {
      offset = (i * sectionLength) + 1;
      chunks[i * 2] = prefix + contentLine.substring(offset, offset + sectionLength);
      chunks[i * 2 + 1] = prefix + this.decorator.diff(diffLine.substring(offset, offset + sectionLength));
    }

    return chunks;
  }

  public formatMessage(message: string, padding: string): string {
    if (!message) {
      return "";
    }

    return padding + message.replace(/(\n)+/g, os.EOL + padding);
  }

  public formatUpdate(item: plugin.ProgressReport): string {
    if (!item) {
      return " ";
    } else if (item.resultType === "PASSED") {
      return ".";
    } else if (item.resultType === "FAILED") {
      return this.decorator.failed("!");
    } else if (item.resultType === "SKIPPED") {
      return this.decorator.skip("?");
    } else if (item.resultType === "TODO") {
      return this.decorator.todo("-");
    }

    return " ";
  }
}

export function createTestResultFormatter(testResultDecorator?: plugin.TestResultDecorator): TestResultFormatter {
  if (!testResultDecorator) {
    testResultDecorator = createTestResultDecoratorConsole();
  }

  return new TestResultFormatterImp(createComparer(), testResultDecorator);
}
