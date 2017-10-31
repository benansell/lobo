import * as _ from "lodash";
import {Comparer, createComparer} from "./comparer";
import * as plugin from "./plugin";
import {createTestResultDecoratorConsole} from "./test-result-decorator-console";
import * as os from "os";

export interface TestResultFormatter {
  defaultIndentation(): string;
  formatDebugLogMessages(report: plugin.TestReportLogged, padding: string): string;
  formatFailure(report: plugin.TestReportFailedLeaf, padding: string, maxLength: number): string;
  formatNotRun(report: plugin.TestReportSkippedLeaf, padding: string): string;
  formatUpdate(report: plugin.ProgressReport): string;
}

export class TestResultFormatterImp implements TestResultFormatter {
  public static bulletPoint: string = "•";
  public static verticalBarEnd: string = "└";
  public static verticalBarMiddle: string = "│";
  public static verticalBarStart: string = "┌";

  private comparer: Comparer;
  private decorator: plugin.TestResultDecorator;

  public constructor(comparer: Comparer, decorator: plugin.TestResultDecorator) {
    this.comparer = comparer;
    this.decorator = decorator;
  }

  public defaultIndentation(): string {
    return "  ";
  }

  public formatDebugLogMessages(report: plugin.TestReportLogged, padding: string): string {
    if (!report.logMessages || report.logMessages.length === 0) {
      return "";
    }

    let output: string = "";

    _.forEach(report.logMessages, (logMessage: string) => {
      output += `${padding}${this.decorator.rightArrow()} ${this.decorator.debugLog(logMessage)}${os.EOL}`;
    });

    return output + os.EOL;
  }

  public formatFailure(report: plugin.TestReportFailedLeaf, padding: string, maxLength: number): string {
    let lines: string[] = [];

    _.forEach(report.resultMessages, (resultMessage: plugin.FailureMessage) => {
      if (resultMessage.given && resultMessage.given.length > 0) {
        let givenMessageHeader = this.formatMessage(`${TestResultFormatterImp.bulletPoint} ${this.decorator.given("Given")}`, padding);

        lines.push(`${os.EOL}${this.decorator.line(givenMessageHeader)}`);
        let givenMessage = this.formatMessage(this.defaultIndentation() + resultMessage.given, padding);
        lines.push(`${os.EOL}${this.decorator.line(givenMessage)}${os.EOL}`);
      }

      let message = this.formatFailureMessage(resultMessage.message, maxLength);
      lines.push(this.formatMessage(message, padding));
    });

    let rawOutput = lines.join("");

    let output = rawOutput
      .replace(new RegExp(TestResultFormatterImp.bulletPoint, "g"), this.decorator.bulletPoint())
      .replace(new RegExp(TestResultFormatterImp.verticalBarStart, "g"), this.decorator.verticalBarStart())
      .replace(new RegExp(TestResultFormatterImp.verticalBarMiddle, "g"), this.decorator.verticalBarMiddle())
      .replace(new RegExp(TestResultFormatterImp.verticalBarEnd, "g"), this.decorator.verticalBarEnd());

    if (report.logMessages && report.logMessages.length > 0) {
      return output;
    }

    return output + os.EOL;
  }

  public formatNotRun(report: plugin.TestReportSkippedLeaf, padding: string): string {
    let message = this.formatMessage(report.reason, padding);

    return `${os.EOL}${this.defaultIndentation()}${message}${os.EOL}`;
  }

  public formatFailureMessage(message: string, maxLength: number): string {
    if (message.indexOf(TestResultFormatterImp.verticalBarMiddle) === -1) {
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

    if (lines[2].indexOf(TestResultFormatterImp.verticalBarMiddle + " ") !== -1) {
      lines[0] = TestResultFormatterImp.verticalBarStart + " " + lines[0];
      lines[1] = lines[1].replace(/(╵|╷)/, TestResultFormatterImp.verticalBarMiddle);
      lines[3] = lines[3].replace(/(╵|╷)/, TestResultFormatterImp.verticalBarMiddle);
      lines[4] = TestResultFormatterImp.verticalBarEnd + " " + lines[4];

      let expectMessage = lines[2].substring(2, lines[2].length);
      lines[2] = lines[2].replace(expectMessage, this.decorator.expect(expectMessage));
    }

    let expectEqualRegex = /Expect.equal(Dicts|Lists|Sets)*/;

    if (expectEqualRegex.test(lines[2])) {
      lines = this.formatExpectEqualFailure(lines, maxLength);
    }

    let output = _.map(lines, x => this.decorator.line(x));

    return `${os.EOL}${output.join(os.EOL)}${os.EOL}`;
  }

  public formatExpectEqualFailure(unprocessedLines: string[], maxLength: number): string[] {
    let lines: Array<string | string[]> = _.clone(unprocessedLines);
    lines.push("   ");

    let end = TestResultFormatterImp.verticalBarEnd + " ";
    let middle = TestResultFormatterImp.verticalBarMiddle + " ";
    let start = TestResultFormatterImp.verticalBarStart + " ";

    // remove "┌ " and "└ "
    let left = (<string>lines[0]).substring(2);
    let right = (<string>lines[4]).substring(2);
    let value = this.comparer.diff(left, right);
    lines[1] = middle + value.left;
    lines[5] = "  " + value.right;

    lines[0] = this.chunkLine(<string>lines[0], <string>lines[1], maxLength, start, middle);
    lines[1] = "";

    lines[4] = this.chunkLine(<string>lines[4], <string>lines[5], maxLength, end, "  ");
    lines[5] = "";

    return <string[]> _.flattenDepth(lines, 1).filter(x => x !== "");
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

  public formatUpdate(report: plugin.ProgressReport): string {
    if (!report) {
      return " ";
    } else if (report.resultType === "PASSED") {
      return ".";
    } else if (report.resultType === "FAILED") {
      return this.decorator.failed("!");
    } else if (report.resultType === "SKIPPED") {
      return this.decorator.skip("?");
    } else if (report.resultType === "TODO") {
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
