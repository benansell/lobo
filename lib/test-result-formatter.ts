import * as _ from "lodash";
import * as Chalk from "chalk";
import {Comparer, createComparer} from "./comparer";

export interface TestResultFormatter {
  formatFailure(message: string, maxLength: number): string;

  formatMessage(rawMessage: string, padding: string): string;
}

export class TestResultFormatterImp implements TestResultFormatter {
  private comparer: Comparer;

  public constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

  public formatFailure(message: string, maxLength: number): string {
    if (message.indexOf("│") === -1) {
      return message.replace(message, "\n  " + Chalk.yellow(message) + "\n");
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
      lines[2] = lines[2].replace(expectMessage, Chalk.yellow(expectMessage));
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
    chunks[1] = prefix + Chalk.red(diffLine.substring(1, sectionLength + 1));

    for (let i = 1; i < size; i++) {
      offset = (i * sectionLength) + 1;
      chunks[i * 2] = prefix + contentLine.substring(offset, offset + sectionLength);
      chunks[i * 2 + 1] = prefix + Chalk.red(diffLine.substring(offset, offset + sectionLength));
    }

    return chunks;
  }

  public formatMessage(message: string, padding: string): string {
    if (!message) {
      return "";
    }

    return padding + message.replace(/(\n)+/g, "\n" + padding);
  }
}

export function createTestResultFormatter(): TestResultFormatter {
  return new TestResultFormatterImp(createComparer());
}
