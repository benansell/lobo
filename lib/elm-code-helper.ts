export interface CommentBlock {
  fromIndex: number;
  toIndex: number;
}

export interface FindWordResult {
  nextIndex: number;
  word: string;
}

export interface ElmCodeHelper {
  readonly maxIndex: number;
  codeBetween(startIndex: number, endIndex: number): string;
  findChar(startIndex: number, searchChar: string, includeComments?: boolean): number | undefined;
  findClose(startIndex: number, open: string, close: string, includeComments?: boolean): number | undefined;
  findEndComment(wordResult: FindWordResult): number | undefined;
  findNextWord(startIndex: number, skipComments?: boolean, delimiters?: string[]): FindWordResult;
  findUntilEndOfBlock(startIndex: number, wordResult: FindWordResult): FindWordResult | undefined;
  isWordComment(word: string): boolean;
}

export class ElmCodeHelperImp implements ElmCodeHelper {

  public readonly maxIndex: number;
  private readonly code: string;
  private readonly commentMap: CommentBlock[];

  constructor(code: string) {
    this.code = code;
    this.maxIndex = code.length - 1;
    this.commentMap = this.buildCommentMap(this.code);
  }

  public buildCommentMap(code: string): CommentBlock[] {
    const commentMap: CommentBlock[] = [];
    let from: number | undefined;
    let fromLine: number | undefined;
    let blockCount: number = 0;

    for (let i = 0; i <= code.length; i++) {
      if (code[i] === "{" && code[i + 1] === "-") {
        if (from === undefined) {
          from = i;
        }

        blockCount++;
      } else if (from !== undefined && code[i] === "-" && code[i + 1] === "}") {
        if (blockCount === 1) {
          commentMap.push({fromIndex: from, toIndex: i + 1});
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

    if (from !== undefined) {
      commentMap.push({fromIndex: from, toIndex: code.length - 1});
    } else if (fromLine !== undefined) {
      commentMap.push({fromIndex: fromLine, toIndex: code.length - 1});
    }

    return commentMap;
  }

  public codeBetween(startIndex: number, endIndex: number): string {
    return this.code.substring(startIndex, endIndex + 1);
  }

  public exists(index: number, searchTerms: string[]): number {
    for (let i = 0; i < searchTerms.length; i++) {
      if (this.existsAt(index, searchTerms[i])) {
        return i;
      }
    }

    return -1;
  }

  public existsAt(index: number, searchTerm: string): boolean {
    for (let i = 0; i < searchTerm.length; i++) {
      if (this.code[index + i] !== searchTerm[i]) {
        return false;
      }
    }

    return true;
  }

  public findIncludingComments<T>(startIndex: number, isMatch: (index: number) => T): T | undefined {
    let index = startIndex;

    while (index <= this.maxIndex) {
      const result = isMatch(index);

      if (result) {
        return result;
      }

      index++;
    }

    return undefined;
  }

  public findExcludingComments<T>(startIndex: number, isMatch: (index: number) => T): T | undefined {
    let commentIndex = 0;
    const maxCommentMapIndex = this.commentMap.length - 1;

    while (commentIndex <= maxCommentMapIndex) {
      if (this.commentMap[commentIndex].toIndex > startIndex) {
        break;
      }

      commentIndex++;
    }

    let index = startIndex;

    while (index <= this.maxIndex) {
      if (commentIndex <= maxCommentMapIndex
        && this.commentMap[commentIndex].fromIndex <= index
        && this.commentMap[commentIndex].toIndex >= index) {
        index = this.commentMap[commentIndex].toIndex + 1;
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

  public findChar(startIndex: number, searchChar: string, includeComments: boolean = false): number | undefined {
    let isMatch: (index: number) => number | undefined = (index) => {
      if (this.existsAt(index, searchChar)) {
        return index;
      } else {
        return undefined;
      }
    };

    if (includeComments) {
      return this.findIncludingComments(startIndex, isMatch);
    }

    return this.findExcludingComments(startIndex, isMatch);
  }

  public findClose(startIndex: number, open: string, close: string, includeComments: boolean = false)
    : number | undefined {
    let contextCount: number = 0;
    let isMatch: (index: number) => number | undefined = (index) => {
      if (this.existsAt(index, close)) {
        contextCount--;

        if (contextCount <= 0) {
          return index;
        }
      } else if (this.existsAt(index, open)) {
        contextCount++;
      }

      return undefined;
    };

    if (includeComments) {
      return this.findIncludingComments(startIndex, isMatch);
    }

    return this.findExcludingComments(startIndex, isMatch);
  }

  public findEndComment(wordResult: FindWordResult): number {
    if (wordResult.word[0] === "{" && wordResult.word[1] === "-") {
      const endBlockIndex = this.findClose(wordResult.nextIndex - wordResult.word.length - 1, "{-", "-}", true);

      if (!endBlockIndex) {
        return this.maxIndex;
      }

      return endBlockIndex + 1;
    }

    const endLineIndex = this.findChar(wordResult.nextIndex, "\n", true);

    if (!endLineIndex) {
      return this.maxIndex;
    }

    return endLineIndex - 1;
  }

  public findNextWord(startIndex: number, skipComments: boolean = true, delimiters: string[] = [" ", "\n"]): FindWordResult {
    let isMatch: (index: number) => FindWordResult | undefined = (index) => {
      if (this.exists(index, delimiters) >= 0) {
        if (startIndex === index) {
          return {nextIndex: index + 1, word: this.codeBetween(startIndex, index)};
        } else {
          return {nextIndex: index, word: this.codeBetween(startIndex, index - 1)};
        }
      } else if (index === this.maxIndex) {
        return {nextIndex: index + 1, word: this.codeBetween(startIndex, index)};
      }

      return undefined;
    };

    let result: FindWordResult | undefined;

    if (skipComments) {
      result = this.findExcludingComments(startIndex, isMatch);

      if (result && this.isWordComment(result.word)) {
        const endIndex = this.findEndComment(result);

        return this.findNextWord(endIndex + 1, skipComments, delimiters);
      }
    } else {
      result = this.findIncludingComments(startIndex, isMatch);

      if (result && this.isWordComment(result.word)) {
        const endIndex = this.findEndComment(result);

        return {nextIndex: endIndex + 1, word: this.codeBetween(startIndex, endIndex)};
      }
    }

    if (result) {
      return result;
    }

    return {nextIndex: this.maxIndex + 1, word: this.codeBetween(startIndex, this.maxIndex)};
  }

  public findUntilEndOfBlock(startIndex: number, wordResult: FindWordResult): FindWordResult | undefined {
    let currentStartIndex = startIndex;
    let endIndex = startIndex;
    let isMatch: (index: number) => FindWordResult | undefined = (index) => {
      if (this.code[index] === "\n") {
        if (this.code[index - 1] !== "\n") {
          endIndex = index - 1;
        }

        if (this.code[index + 1] !== "\n" && this.code[index + 1] !== " ") {
          return {nextIndex: endIndex, word: wordResult.word};
        }
      }

      return undefined;
    };

    const result = this.findExcludingComments(currentStartIndex, isMatch);

    if (result) {
      return result;
    }

    return {nextIndex: this.maxIndex, word: wordResult.word};
  }

  public isWordComment(word: string): boolean {
    if (!word || word.length < 2) {
      return false;
    }

    return word[1] === "-" && (word[0] === "{" || word[0] === "-");
  }
}

export function makeElmCodeHelper(code: string): ElmCodeHelper {
  return new ElmCodeHelperImp(code);
}
