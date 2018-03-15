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
  findChar(startIndex: number, searchChar: string, includeComments: boolean): number | undefined;
  findClose(startIndex: number, open: string, close: string, includeComments: boolean): number | undefined;
  findNextWord(startIndex: number): FindWordResult;
  findUntilEndOfBlock(startIndex: number, wordResult: FindWordResult): FindWordResult | undefined;
}

export class ElmCodeHelperImp implements ElmCodeHelper {

  public readonly maxIndex: number;

  private code: string;
  private commentMap: CommentBlock[];

  constructor(code: string) {
    this.code = code;
    this.maxIndex = code.length - 1;
    this.commentMap = this.buildCommentMap(this.code, this.maxIndex);
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

  public codeBetween(startIndex: number, endIndex: number): string {
    return this.code.substring(startIndex, endIndex + 1);
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
        && this.commentMap[commentIndex].fromIndex >= index
        && this.commentMap[commentIndex].toIndex <= index) {
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

  public findChar(startIndex: number, searchChar: string, includeComments: boolean): number | undefined {
    let isMatch: (index: number) => number | undefined = (index) => {
      if (this.existsAt(index, searchChar) ) {
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

  public findClose(startIndex: number, open: string, close: string, includeComments: boolean)
  : number | undefined {
    let contextCount: number = 0;
    let isMatch: (index: number) => number | undefined = (index) => {
      if (this.existsAt(index, close)) {
        contextCount--;

        if (contextCount === 0) {
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

  public findNextWord(startIndex: number): FindWordResult {
    let isMatch: (index: number) => FindWordResult | undefined = (index) => {
      if (this.code[index] === " " || this.code[index] === "\n") {
        return { nextIndex: index, word: this.code.substring(startIndex, index) };
      }

      return undefined;
    };

    const result = this.findExcludingComments(startIndex, isMatch);

    if (result) {
      return result;
    }

    return { nextIndex: this.maxIndex, word: this.code.substring(startIndex, this.maxIndex) };
  }

  public findUntilEndOfBlock(startIndex: number, wordResult: FindWordResult): FindWordResult | undefined {
    let currentStartIndex = startIndex;
    let endIndex = startIndex;
    let isMatch: (index: number) => FindWordResult | undefined = (index) => {
      if (this.code[index] === "\n") {
        if (this.code[index - 1] !== "\n" ) {
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

    return { nextIndex: this.maxIndex, word: wordResult.word };
  }
}

export function createElmCodeHelper(code: string): ElmCodeHelper {
  return new ElmCodeHelperImp(code);
}
