import * as fs from "fs";
import {createLogger, Logger} from "./logger";
import {createElmCodeHelper, ElmCodeHelper, FindWordResult} from "./elm-code-helper";

export interface CodeLocation {
  columnNumber: number;
  lineNumber: number;
}

export type ElmTokenType = "Comment"
  | "Import"
  | "Module"
  | "NamedFunction"
  | "Port"
  | "Type"
  | "TypeAlias"
  | "Whitespace";

export interface ElmToken {
  code: string;
  end: CodeLocation;
  identifier: string;
  start: CodeLocation;
  tokenType: ElmTokenType;
}

export interface PartialElmToken {
  endIndex: number;
  identifier: string;
  startIndex: number;
  tokenType: ElmTokenType;
}

export interface ElmTokenizer {
  analyze(filePath: string): ElmToken[];
}

export class ElmTokenizerImp implements ElmTokenizer {

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public analyze(filePath: string): ElmToken[] {
    const code = fs.readFileSync(filePath, "utf8");
    const lineMap = this.buildLineMap(code);
    const codeHelper = createElmCodeHelper(code);

    return this.tokenize(codeHelper, lineMap);
  }

  public buildLineMap(code: string): number[] {
    const lineMap: number[] = [];

    for (let i = 0; i < code.length; i++) {
      if (code[i] === "\n") {
        lineMap.push(i);
      }
    }

    return lineMap;
  }

  public convertIndexToLocation(lineMap: number[], index: number): CodeLocation {
    let previousLineLength = 0;

    for (let i = 0; i < lineMap.length; i++) {
      if (lineMap[i] > index) {
        return { columnNumber: index - previousLineLength + 1, lineNumber: i + 1 };
      }

      previousLineLength = lineMap[i];
    }

    return { columnNumber: index - lineMap[lineMap.length - 2] + 1, lineNumber: lineMap.length + 1 };
  }

  public convertToElmToken(codeHelper: ElmCodeHelper, lineMap: number[], partialToken: PartialElmToken): ElmToken {
    return {
      code: codeHelper.codeBetween(partialToken.startIndex, partialToken.endIndex),
      end: this.convertIndexToLocation(lineMap, partialToken.endIndex),
      identifier: partialToken.identifier,
      start: this.convertIndexToLocation(lineMap, partialToken.startIndex),
      tokenType: partialToken.tokenType
    };
  }

  public tokenize(codeHelper: ElmCodeHelper, lineMap: number[]): ElmToken[] {
    const tokens: ElmToken[] = [];
    let index = 0;

    while (index < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(index);

      if (next.nextIndex === codeHelper.maxIndex) {
        return tokens;
      }

      const partialToken = this.tokenizeWord(codeHelper, index, next);

      if (!partialToken) {
        return tokens;
      } else if (partialToken.tokenType !== "Whitespace") {
        tokens.push(this.convertToElmToken(codeHelper, lineMap, partialToken));
      }

      index = partialToken.endIndex + 1;
    }

    return tokens;
  }

  public tokenizeWord(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    if (wordResult.word === "") {
      return { tokenType: "Whitespace", startIndex: startWordIndex, endIndex: wordResult.nextIndex, identifier: "" };
    }

    if (wordResult.word === "{-") {
      const endLineIndex = codeHelper.findClose( wordResult.nextIndex - 2, "{-", "-}", true);

      if (!endLineIndex) {
        this.logger.debug("Unable to tokenize block comment due to missing close comment after index " + wordResult.nextIndex);
        return undefined;
      }

      return { tokenType: "Comment", startIndex: startWordIndex, endIndex: endLineIndex + 1, identifier: "" };
    }

    if (wordResult.word[0] === "-" && wordResult.word[1] === "-") {
      const endLineIndex = codeHelper.findChar( wordResult.nextIndex + 1 - wordResult.word.length, "\n", true);

      if (!endLineIndex) {
        this.logger.debug("Unable to tokenize line comment due to missing end of line after index " + wordResult.nextIndex);
        return undefined;
      }

      return { tokenType: "Comment", startIndex: startWordIndex, endIndex: endLineIndex - 1, identifier: "" };
    }

    if (wordResult.word === "type") {
      let next = codeHelper.findNextWord(wordResult.nextIndex + 1);

      if (next.word === "alias") {
        next = codeHelper.findNextWord( next.nextIndex + 1);
        const typeAliasEndIndex = codeHelper.findClose(next.nextIndex + 1, "{", "}", false);

        if (!typeAliasEndIndex) {
          this.logger.debug("Unable to tokenize type alias due to missing close bracket after index " + wordResult.nextIndex);
          return undefined;
        }

        return { tokenType: "TypeAlias", startIndex: startWordIndex, endIndex: typeAliasEndIndex, identifier: next.word };
      }

      return this.findUntilEndOfBlock(codeHelper, startWordIndex, next, "Type", "=");
    }

    if (wordResult.word === "import") {
      let next = codeHelper.findNextWord(wordResult.nextIndex + 1);
      let identifier = next.word;
      let endIndex = next.nextIndex - 1;
      next = codeHelper.findNextWord(next.nextIndex + 1);

      if (next.word === "as") {
        next = codeHelper.findNextWord(next.nextIndex + 1);
        identifier = next.word;
        endIndex = next.nextIndex - 1;
        next = codeHelper.findNextWord(next.nextIndex + 1);
      }

      if (next.word === "exposing") {
        const exposingEndIndex = codeHelper.findClose(next.nextIndex + 1, "(", ")", false);

        if (!exposingEndIndex) {
          this.logger.debug("Unable to tokenize import due to missing close bracket after index " + wordResult.nextIndex);
          return undefined;
        }

        return { tokenType: "Import", startIndex: startWordIndex, endIndex: exposingEndIndex, identifier: identifier };
      }

      return { tokenType: "Import", startIndex: startWordIndex, endIndex: endIndex, identifier: identifier };
    }

    if (wordResult.word === "port") {
      let next = codeHelper.findNextWord(wordResult.nextIndex + 1);

      if (next.word === "module") {
        return this.tokenizeWord(codeHelper, startWordIndex, next);
      }

      return this.findUntilEndOfBlock(codeHelper, startWordIndex, next, "Port", ":");
    }

    if (wordResult.word === "effect") {
      let next = codeHelper.findNextWord(wordResult.nextIndex + 1);

      if (next.word === "module") {
        return this.tokenizeWord(codeHelper, startWordIndex, next);
      }

      return this.findUntilEndOfBlock(codeHelper, startWordIndex, next, "NamedFunction", "=");
    }

    if (wordResult.word === "module") {
      const endIndex = codeHelper.findClose( wordResult.nextIndex, "(", ")", false);

      if (!endIndex) {
        this.logger.debug("Unable to tokenize module due to missing close bracket after index " + wordResult.nextIndex);
        return undefined;
      }

      const identifierResult = codeHelper.findNextWord( wordResult.nextIndex + 1);

      return { tokenType: "Module", startIndex: startWordIndex, endIndex: endIndex, identifier: identifierResult.word };
    }

    return this.findUntilEndOfBlock(codeHelper, startWordIndex, wordResult, "NamedFunction", "=");
  }

  public findUntilEndOfBlock(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult,
                             tokenType: ElmTokenType, searchAfterChar: string): PartialElmToken | undefined {
    const searchAfterCharIndex = codeHelper.findChar(wordResult.nextIndex, searchAfterChar, false);

    if (!searchAfterCharIndex) {
      this.logger.debug(`Unable to tokenize ${tokenType} due to missing "${searchAfterChar}" sign after index ${wordResult.nextIndex}`);
      return undefined;
    }

    let blockResult = codeHelper.findUntilEndOfBlock(searchAfterCharIndex, wordResult);

    if (!blockResult) {
      return { tokenType: tokenType, startIndex: startWordIndex, endIndex: codeHelper.maxIndex, identifier: wordResult.word };
    }

    return { tokenType: tokenType, startIndex: startWordIndex, endIndex: blockResult.nextIndex, identifier: blockResult.word };
  }
}

export function createElmTokenizer(): ElmTokenizer {
  return new ElmTokenizerImp(createLogger());
}
