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

export interface CommentBlock {
  fromIndex: number;
  toIndex: number;
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

  public buildCommentMap(code: string, maxIndex: number): CommentBlock[] {
    const commentMap: CommentBlock[] = [];
    let from: number | undefined;
    let fromLine: number | undefined;
    let blockCount: number = 0;

    for (let i = 0; i <= maxIndex - 1; i++) {
      if (code[i] === "{" && code[i + 1] === "-" ) {
        if (from === undefined) {
          from = i;
        }

        blockCount++;
      } else if (from !== undefined && code[i] === "-" && code[i + 1] === "}") {
        if (blockCount === 1) {
          commentMap.push({fromIndex: from, toIndex: i});
          from = undefined;
        }

        blockCount--;
      } else if (from === undefined && fromLine === undefined && code[i] === "-" && code[i + 1] === "-") {
          fromLine = i;
      } else if (from === undefined && fromLine !== undefined && code[i] === "\n") {
          commentMap.push({fromIndex: fromLine, toIndex: i - 1});
          fromLine = undefined;
      }
    }

    return commentMap;
  }

  public buildLineMap(code: string, maxIndex: number): number[] {
    const lineMap: number[] = [];

    for (let i = 0; i <= maxIndex; i++) {
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
    const commentMap = this.buildCommentMap(code, maxIndex);

    while (index < maxIndex) {
      const next = this.findNextWord(code, commentMap, maxIndex, index);

      if (next.nextIndex === maxIndex) {
          return tokens;
      }

      const partialToken = this.tokenizeWord(code, commentMap, maxIndex, index, next);

      if (!partialToken) {
        return tokens;
      } else if (partialToken.tokenType !== "Whitespace") {
        tokens.push(this.convertToElmToken(code, lineMap, partialToken));
      }

      index = partialToken.endIndex + 1;
    }

    return tokens;
  }

  public tokenizeWord(code: string, commentMap: CommentBlock[], maxIndex: number, startWordIndex: number, wordResult: WordResult)
  : PartialElmToken | undefined {
    if (wordResult.word === "") {
      return { tokenType: "Whitespace", startIndex: startWordIndex, endIndex: wordResult.nextIndex, identifier: "" };
    }

    if (wordResult.word === "{-") {
      const endLineIndex = this.findClose(code, [], maxIndex, wordResult.nextIndex - 2, "{-", "-}");

      if (!endLineIndex) {
        this.logger.debug("Unable to tokenize block comment due to missing close comment after index " + wordResult.nextIndex);
        return undefined;
      }

      return { tokenType: "Comment", startIndex: startWordIndex, endIndex: endLineIndex + 1, identifier: "" };
    }

    if (wordResult.word[0] === "-" && wordResult.word[1] === "-") {
      const endLineIndex = this.findChar(code, [], maxIndex, wordResult.nextIndex + 1 - wordResult.word.length, "\n");

      if (!endLineIndex) {
        this.logger.debug("Unable to tokenize line comment due to missing end of line after index " + wordResult.nextIndex);
        return undefined;
      }

      return { tokenType: "Comment", startIndex: startWordIndex, endIndex: endLineIndex - 1, identifier: "" };
    }

    if (wordResult.word === "type") {
      let next = this.findNextWord(code, commentMap, maxIndex, wordResult.nextIndex + 1);

      if (next.word === "alias") {
        next = this.findNextWord(code, commentMap, maxIndex, next.nextIndex + 1);
        const typeAliasEndIndex = this.findClose(code, commentMap, maxIndex, next.nextIndex + 1, "{", "}");

        if (!typeAliasEndIndex) {
          this.logger.debug("Unable to tokenize type alias due to missing close bracket after index " + wordResult.nextIndex);
          return undefined;
        }

        return { tokenType: "TypeAlias", startIndex: startWordIndex, endIndex: typeAliasEndIndex, identifier: next.word };
      }

      return this.findUntilEndOfBlock(code, commentMap, maxIndex, startWordIndex, next, "Type", "=");
    }

    if (wordResult.word === "import") {
      let next = this.findNextWord(code, commentMap, maxIndex, wordResult.nextIndex + 1);
      let identifier = next.word;
      let endIndex = next.nextIndex - 1;
      next = this.findNextWord(code, commentMap, maxIndex, next.nextIndex + 1);

      if (next.word === "as") {
        next = this.findNextWord(code, commentMap, maxIndex, next.nextIndex + 1);
        identifier = next.word;
        endIndex = next.nextIndex - 1;
        next = this.findNextWord(code, commentMap, maxIndex, next.nextIndex + 1);
      }

      if (next.word === "exposing") {
        const exposingEndIndex = this.findClose(code, commentMap, maxIndex, next.nextIndex + 1, "(", ")");

        if (!exposingEndIndex) {
          this.logger.debug("Unable to tokenize import due to missing close bracket after index " + wordResult.nextIndex);
          return undefined;
        }

        return { tokenType: "Import", startIndex: startWordIndex, endIndex: exposingEndIndex, identifier: identifier };
      }

      return { tokenType: "Import", startIndex: startWordIndex, endIndex: endIndex, identifier: identifier };
    }

    if (wordResult.word === "port") {
      let next = this.findNextWord(code, commentMap, maxIndex, wordResult.nextIndex + 1);

      if (next.word === "module") {
        return this.tokenizeWord(code, commentMap, maxIndex, startWordIndex, next);
      }

      return this.findUntilEndOfBlock(code, commentMap, maxIndex, startWordIndex, next, "Port", ":");
    }

    if (wordResult.word === "effect") {
      let next = this.findNextWord(code, commentMap, maxIndex, wordResult.nextIndex + 1);

      if (next.word === "module") {
        return this.tokenizeWord(code, commentMap, maxIndex, startWordIndex, next);
      }

      return this.findUntilEndOfBlock(code, commentMap, maxIndex, startWordIndex, next, "NamedFunction", "=");
    }

    if (wordResult.word === "module") {
      const endIndex = this.findClose(code, commentMap, maxIndex, wordResult.nextIndex, "(", ")");

      if (!endIndex) {
        this.logger.debug("Unable to tokenize module due to missing close bracket after index " + wordResult.nextIndex);
        return undefined;
      }

      const identifierResult = this.findNextWord(code, commentMap, maxIndex, wordResult.nextIndex + 1);

      return { tokenType: "Module", startIndex: startWordIndex, endIndex: endIndex, identifier: identifierResult.word };
    }

    return this.findUntilEndOfBlock(code, commentMap, maxIndex, startWordIndex, wordResult, "NamedFunction", "=");
  }

  public existsAt(code: string, index: number, searchTerm: string): boolean {
    for (let i = 0; i < searchTerm.length; i++) {
      if (code[index + i] !== searchTerm[i]) {
        return false;
      }
    }

    return true;
  }

  public find<T>(commentMap: CommentBlock[], maxIndex: number, startIndex: number, isMatch: (index: number) => T): T | undefined {
    let commentIndex = 0;
    const maxCommentMapIndex = commentMap.length - 1;

    while (commentIndex <= maxCommentMapIndex) {
      if (commentMap[commentIndex].toIndex > startIndex) {
        break;
      }

      commentIndex++;
    }

    let index = startIndex;

    while (index <= maxIndex) {
      if (commentIndex <= maxCommentMapIndex && commentMap[commentIndex].fromIndex >= index && commentMap[commentIndex].toIndex <= index) {
        index = commentMap[commentIndex].toIndex + 1;
        commentIndex++;
      } else {
        const result = isMatch(index);

        if (result) {
          return result;
        }

        index++;
      }
    }

    return undefined;
  }

  public findChar(code: string, commentMap: CommentBlock[], maxIndex: number, startIndex: number, searchChar: string): number | undefined {
    let isMatch: (index: number) => number | undefined = (index) => {
      if (this.existsAt(code, index, searchChar) ) {
        return index;
      } else {
        return undefined;
      }
    };

    return this.find(commentMap, maxIndex, startIndex, isMatch);
  }

  public findClose(code: string, commentMap: CommentBlock[], maxIndex: number, startIndex: number, open: string, close: string)
  : number | undefined {
    let contextCount: number = 0;
    let isMatch: (index: number) => number | undefined = (index) => {
      if (this.existsAt(code, index, close)) {
        contextCount--;

        if (contextCount === 0) {
          return index;
        }
      } else if (this.existsAt(code, index, open)) {
        contextCount++;
      }

      return undefined;
    };

    return this.find(commentMap, maxIndex, startIndex, isMatch);
  }

  public findNextWord(code: string, commentMap: CommentBlock[], maxIndex: number, startIndex: number): WordResult {
    let isMatch: (index: number) => WordResult | undefined = (index) => {
      if (code[index] === " " || code[index] === "\n") {
        return { nextIndex: index, word: code.substring(startIndex, index) };
      }

      return undefined;
    };

    const result = this.find(commentMap, maxIndex, startIndex, isMatch);

    if (result) {
      return result;
    }

    return { nextIndex: maxIndex, word: code.substring(startIndex, maxIndex) };
  }

  public findUntilEndOfBlock(code: string, commentMap: CommentBlock[], maxIndex: number, startWordIndex: number, wordResult: WordResult,
                             tokenType: ElmTokenType, searchAfterChar: string): PartialElmToken | undefined {
    const searchAfterCharIndex = this.findChar(code, commentMap, maxIndex, wordResult.nextIndex, searchAfterChar);

    if (!searchAfterCharIndex) {
      this.logger.debug(`Unable to tokenize ${tokenType} due to missing "${searchAfterChar}" sign after index ${wordResult.nextIndex}`);
      return undefined;
    }

    let startIndex = searchAfterCharIndex;
    let endIndex = searchAfterCharIndex;
    let isMatch: (index: number) => PartialElmToken | undefined = (index) => {
      if (code[index] === "\n") {
        if (code[index - 1] !== "\n" ) {
          endIndex = index - 1;
        }

        if (code[index + 1] !== "\n" && code[index + 1] !== " ") {
          return {tokenType: tokenType, startIndex: startWordIndex, endIndex: endIndex, identifier: wordResult.word};
        }
      }

      return undefined;
    };

    const result = this.find(commentMap, maxIndex, startIndex, isMatch);

    if (result) {
      return result;
    }

    return { tokenType: tokenType, startIndex: startWordIndex, endIndex: maxIndex, identifier: wordResult.word };
  }
}

export function createElmTokenizer(): ElmTokenizer {
  return new ElmTokenizerImp(createLogger());
}
