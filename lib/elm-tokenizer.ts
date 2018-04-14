import {createLogger, Logger} from "./logger";
import {makeElmCodeHelper, ElmCodeHelper, FindWordResult} from "./elm-code-helper";
import {createUtil, Util} from "./util";
import {CodeLocation} from "./plugin";

export enum ElmTokenType {
  Comment = 1,
  Import,
  Module,
  Port,
  Type,
  TypeAlias,
  TypedModuleFunction,
  UntypedModuleFunction,
  Whitespace
}

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
  tokenize(filePath: string): ElmToken[];
}

export class ElmTokenizerImp implements ElmTokenizer {

  private readonly makeElmCodeHelper: (code: string) => ElmCodeHelper;
  private readonly logger: Logger;
  private readonly util: Util;

  constructor(logger: Logger, util: Util, makeCodeHelper: (code: string) => ElmCodeHelper) {
    this.logger = logger;
    this.util = util;
    this.makeElmCodeHelper = makeCodeHelper;
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
    let previousLength = lineMap.length === 0 ? 1 : 0;

    for (let i = 0; i < lineMap.length; i++) {
      if (lineMap[i] > index) {
        return { columnNumber: index - previousLength, lineNumber: i + 1 };
      }

      previousLength = lineMap[i];
    }

    return { columnNumber: index - previousLength, lineNumber: lineMap.length + 1 };
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

  public read(filePath: string): string | undefined {
    const code = this.util.read(filePath);

    if (!code) {
      return undefined;
    }

    return code.replace(/\r/g, "");
  }

  public tokenize(filePath: string): ElmToken[] {
    const code = this.read(filePath);

    if (!code) {
      return [];
    }

    const lineMap = this.buildLineMap(code);
    const codeHelper = this.makeElmCodeHelper(code);

    return this.tokenizeCode(codeHelper, lineMap);
  }

  public tokenizeCode(codeHelper: ElmCodeHelper, lineMap: number[]): ElmToken[] {
    const tokens: ElmToken[] = [];
    let index = 0;

    while (index < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(index, false);

      if (next.nextIndex >= codeHelper.maxIndex) {
        return tokens;
      }

      const partialToken = this.tokenizeWord(codeHelper, index, next);

      if (!partialToken) {
        return tokens;
      } else if (partialToken.tokenType !== ElmTokenType.Whitespace) {
        tokens.push(this.convertToElmToken(codeHelper, lineMap, partialToken));
      }

      index = partialToken.endIndex + 1;
    }

    return tokens;
  }

  public tokenizeWord(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    if (wordResult.word === " " || wordResult.word === "\n") {
      return this.tokenizeWhitespace(startWordIndex, wordResult);
    }

    if (codeHelper.isWordComment(wordResult.word)) {
      return this.tokenizeComment(codeHelper, startWordIndex, wordResult);
    }

    if (wordResult.word === "type") {
      return this.tokenizeType(codeHelper, startWordIndex, wordResult);
    }

    if (wordResult.word === "import") {
      return this.tokenizeImport(codeHelper, startWordIndex, wordResult);
    }

    if (wordResult.word === "port") {
      return this.tokenizePort(codeHelper, startWordIndex, wordResult);
    }

    if (wordResult.word === "effect") {
      return this.tokenizeEffect(codeHelper, startWordIndex, wordResult);
    }

    if (wordResult.word === "module") {
      return this.tokenizeModule(codeHelper, startWordIndex, wordResult);
    }

    return this.tokenizeFunction(codeHelper, startWordIndex, wordResult);
  }

  public tokenizeComment(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    const endCommentIndex = codeHelper.findEndComment(wordResult);

    if (endCommentIndex === codeHelper.maxIndex) {
      this.logger.debug("Unable to tokenize comment due to missing end comment after index " + wordResult.nextIndex);
    }

    return {tokenType: ElmTokenType.Comment, startIndex: startWordIndex, endIndex: endCommentIndex, identifier: ""};
  }

  public tokenizeEffect(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    let next = codeHelper.findNextWord(wordResult.nextIndex + 1);

    if (next.word === "module") {
      return this.tokenizeWord(codeHelper, startWordIndex, next);
    }

    return this.tokenizeFunction(codeHelper, startWordIndex, wordResult);
  }

  public tokenizeFunction(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    let next =  codeHelper.findNextWord(wordResult.nextIndex + 1);
    let tokenType: ElmTokenType = ElmTokenType.UntypedModuleFunction;

    if (next.word === ":") {
      tokenType = ElmTokenType.TypedModuleFunction;
    }

    return this.tokenizeUntilEndOfBlock(codeHelper, startWordIndex, wordResult, tokenType, "=");
  }

  public tokenizeImport(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    let identifierResult = codeHelper.findNextWord(wordResult.nextIndex + 1);
    let identifier = identifierResult.word;
    let endIndex = identifierResult.nextIndex - 1;
    let next = codeHelper.findNextWord(identifierResult.nextIndex + 1);

    if (next.word === "as") {
      next = codeHelper.findNextWord(next.nextIndex + 1);
      identifier = `${identifier} as ${next.word}`;
      endIndex = next.nextIndex - 1;
      next = codeHelper.findNextWord(next.nextIndex + 1);
    }

    if (next.word === "exposing") {
      const exposingEndIndex = codeHelper.findClose(next.nextIndex + 1, "(", ")");

      if (!exposingEndIndex) {
        this.logger.debug("Unable to tokenize import due to missing close bracket after index " + wordResult.nextIndex);
        return undefined;
      }

      endIndex = exposingEndIndex;
    }

    return { tokenType: ElmTokenType.Import, startIndex: startWordIndex, endIndex: endIndex, identifier: identifier };
  }

  public tokenizeModule(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    const endIndex = codeHelper.findClose(wordResult.nextIndex + 1, "(", ")");

    if (!endIndex) {
      this.logger.debug("Unable to tokenize module due to missing close bracket after index " + wordResult.nextIndex);
      return undefined;
    }

    const identifierResult = codeHelper.findNextWord(wordResult.nextIndex + 1);

    return { tokenType: ElmTokenType.Module, startIndex: startWordIndex, endIndex: endIndex, identifier: identifierResult.word };
  }

  public tokenizePort(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    let next = codeHelper.findNextWord(wordResult.nextIndex + 1);

    if (next.word === "module") {
      return this.tokenizeWord(codeHelper, startWordIndex, next);
    }

    return this.tokenizeUntilEndOfBlock(codeHelper, startWordIndex, next, ElmTokenType.Port, ":");
  }

  public tokenizeType(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult): PartialElmToken | undefined {
    let next = codeHelper.findNextWord(wordResult.nextIndex + 1);

    if (next.word === "alias") {
      next = codeHelper.findNextWord( next.nextIndex + 1);
      const typeAliasEndIndex = codeHelper.findClose(next.nextIndex, "{", "}");

      if (!typeAliasEndIndex) {
        this.logger.debug("Unable to tokenize type alias due to missing close bracket after index " + wordResult.nextIndex);
        return undefined;
      }

      return { tokenType: ElmTokenType.TypeAlias, startIndex: startWordIndex, endIndex: typeAliasEndIndex, identifier: next.word };
    }

    return this.tokenizeUntilEndOfBlock(codeHelper, startWordIndex, next, ElmTokenType.Type, "=");
  }

  public tokenizeUntilEndOfBlock(codeHelper: ElmCodeHelper, startWordIndex: number, wordResult: FindWordResult,
                                 tokenType: ElmTokenType, searchAfterChar: string): PartialElmToken | undefined {
    const searchAfterCharIndex = codeHelper.findChar(wordResult.nextIndex, searchAfterChar);

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

  public tokenizeWhitespace(startWordIndex: number, wordResult: FindWordResult): PartialElmToken {
    return {tokenType: ElmTokenType.Whitespace, startIndex: startWordIndex, endIndex: wordResult.nextIndex - 1, identifier: ""};
  }
}

export function createElmTokenizer(): ElmTokenizer {
  return new ElmTokenizerImp(createLogger(), createUtil(), makeElmCodeHelper);
}
