import * as fs from "fs";
import {createLogger, Logger} from "./logger";

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

export interface CodeLocation {
  columnNumber: number;
  lineNumber: number;
}

export interface WordResult {
  nextIndex: number;
  word: string;
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

    return this.tokenize(code);
  }

  public buildLineMap(code: string, maxIndex: number): number[] {
    const lineMap: number[] = [];

    for (let i = 0; i < maxIndex; i++) {
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

  public convertToElmToken(code: string, lineMap: number[], partialToken: PartialElmToken): ElmToken {
    return {
      code: code.substring(partialToken.startIndex, partialToken.endIndex + 1),
      end: this.convertIndexToLocation(lineMap, partialToken.endIndex),
      identifier: partialToken.identifier,
      start: this.convertIndexToLocation(lineMap, partialToken.startIndex),
      tokenType: partialToken.tokenType
    };
  }

  public tokenize(code: string): ElmToken[] {
    const tokens: ElmToken[] = [];
    let index = 0;
    const maxIndex = code.length - 1;
    const lineMap = this.buildLineMap(code, maxIndex);

    while (index < maxIndex) {
      const next = this.findNextWord(code, maxIndex, index);

      if (next.nextIndex === maxIndex) {
          return tokens;
      }

      const partialToken = this.tokenizeWord(code, maxIndex, index, next);

      if (!partialToken) {
        return tokens;
      } else if (partialToken.tokenType !== "Whitespace") {
        tokens.push(this.convertToElmToken(code, lineMap, partialToken));
      }

      index = partialToken.endIndex + 1;
    }

    return tokens;
  }

  public tokenizeWord(code: string, maxIndex: number, startWordIndex: number, wordResult: WordResult): PartialElmToken | undefined {
    if (wordResult.word === "") {
      return { tokenType: "Whitespace", startIndex: startWordIndex, endIndex: wordResult.nextIndex, identifier: "" };
    }

    if (wordResult.word === "--") {
      const endLineIndex = this.findChar(code, maxIndex, wordResult.nextIndex + 1, "\n");

      if (!endLineIndex) {
        this.logger.debug("Unable to tokenize line comment due to missing end of line after index " + wordResult.nextIndex);
        return undefined;
      }

      return { tokenType: "Comment", startIndex: startWordIndex, endIndex: endLineIndex - 1, identifier: "" };
    }

    if (wordResult.word === "type") {
      let next = this.findNextWord(code, maxIndex, wordResult.nextIndex + 1);

      if (next.word === "alias") {
        next = this.findNextWord(code, maxIndex, next.nextIndex + 1);
        const typeAliasEndIndex = this.findClose(code, maxIndex, next.nextIndex + 1, "{", "}");

        if (!typeAliasEndIndex) {
          this.logger.debug("Unable to tokenize type alias due to missing close bracket after index " + wordResult.nextIndex);
          return undefined;
        }

        return { tokenType: "TypeAlias", startIndex: startWordIndex, endIndex: typeAliasEndIndex, identifier: next.word };
      }

      return this.findUntilEndOfBlock(code, maxIndex, startWordIndex, next, "Type");
    }

    if (wordResult.word === "import") {
      let next = this.findNextWord(code, maxIndex, wordResult.nextIndex + 1);
      let identifier = next.word;
      let endIndex = next.nextIndex - 1;
      next = this.findNextWord(code, maxIndex, next.nextIndex + 1);

      if (next.word === "as") {
        next = this.findNextWord(code, maxIndex, next.nextIndex + 1);
        identifier = next.word;
        endIndex = next.nextIndex - 1;
        next = this.findNextWord(code, maxIndex, next.nextIndex + 1);
      }

      if (next.word === "exposing") {
        const exposingEndIndex = this.findClose(code, maxIndex, next.nextIndex + 1, "(", ")");

        if (!exposingEndIndex) {
          this.logger.debug("Unable to tokenize import due to missing close bracket after index " + wordResult.nextIndex);
          return undefined;
        }

        return { tokenType: "Import", startIndex: startWordIndex, endIndex: exposingEndIndex, identifier: identifier };
      }

      return { tokenType: "Import", startIndex: startWordIndex, endIndex: endIndex, identifier: identifier };
    }

    if (wordResult.word === "module") {
      const endIndex = this.findClose(code, maxIndex, wordResult.nextIndex, "(", ")");

      if (!endIndex) {
        this.logger.debug("Unable to tokenize module due to missing close bracket after index " + wordResult.nextIndex);
        return undefined;
      }

      const identifierResult = this.findNextWord(code, maxIndex, wordResult.nextIndex + 1);

      return { tokenType: "Module", startIndex: startWordIndex, endIndex: endIndex, identifier: identifierResult.word };
    }

    return this.findUntilEndOfBlock(code, maxIndex, startWordIndex, wordResult, "NamedFunction");
  }

  public findChar(code: string, maxIndex: number, startIndex: number, searchChar: string): number | undefined {
    for (let index = startIndex; index < maxIndex; index++) {
      if (code[index] === searchChar) {
        return index;
      }
    }

    return undefined;
  }

  public findClose(code: string, maxIndex: number, startIndex: number, open: string, close: string): number | undefined {
    let contextCount: number = 0;

    for (let index = startIndex; index < maxIndex; index++) {
      if (code[index] === close) {
        contextCount--;

        if (contextCount === 0) {
          return index;
        }
      } else if (code[index] === open) {
        contextCount++;
      }
    }

    return undefined;
  }

  public findNextWord(code: string, maxIndex: number, startIndex: number): WordResult {
    for (let index = startIndex; index < maxIndex; index++) {
      if (code[index] === " " || code[index] === "\n") {
        return { nextIndex: index, word: code.substring(startIndex, index) };
      }
    }

    return { nextIndex: maxIndex, word: code.substring(startIndex, maxIndex) };
  }

  public findUntilEndOfBlock(code: string, maxIndex: number, startWordIndex: number, wordResult: WordResult, tokenType: ElmTokenType)
  : PartialElmToken | undefined {
    const equalsEndIndex = this.findChar(code, maxIndex, wordResult.nextIndex, "=");

    if (!equalsEndIndex) {
      this.logger.debug(`Unable to tokenize ${tokenType} due to missing equals sign after index ${wordResult.nextIndex}`);
      return undefined;
    }

    for (let index = equalsEndIndex; index < maxIndex - 1; index++) {
      if (code[index] === "\n" && code[index + 1] !== " ") {
        return { tokenType: tokenType, startIndex: startWordIndex, endIndex: index - 1, identifier: wordResult.word };
      }
    }

    return { tokenType: tokenType, startIndex: startWordIndex, endIndex: maxIndex, identifier: wordResult.word };
  }
}

export function createElmTokenizer(): ElmTokenizer {
  return new ElmTokenizerImp(createLogger());
}
