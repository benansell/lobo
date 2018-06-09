"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createElmTokenizer, ElmToken, ElmTokenizer, ElmTokenizerImp, ElmTokenType, PartialElmToken} from "../../../lib/elm-tokenizer";
import {ElmCodeHelper, FindWordResult} from "../../../lib/elm-code-helper";
import {Util} from "../../../lib/util";
import {Logger} from "../../../lib/logger";
import {SinonStub} from "sinon";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib elm-tokenizer", () => {
  let RewiredTokenizer = rewire("../../../lib/elm-tokenizer");
  let mockLogger: Logger;
  let mockUtil: Util;
  let mockMakeElmCodeHelper: SinonStub;
  let tokenizerImp: ElmTokenizerImp;

  beforeEach(() => {
    let rewiredImp = RewiredTokenizer.__get__("ElmTokenizerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.error = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockUtil = <Util> {};
    mockUtil.read = Sinon.spy();
    mockMakeElmCodeHelper = Sinon.stub();
    tokenizerImp = new rewiredImp(mockLogger, mockUtil, mockMakeElmCodeHelper);
  });

  describe("createElmTokenizer", () => {
    it("should return elm tokenizer", () => {
      // act
      let actual: ElmTokenizer = createElmTokenizer();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("buildLineMap", () => {
    it("should return a list of indexes for each occurrence of '\n'", () => {
      // act
      let actual = tokenizerImp.buildLineMap("\na\nbc\n");

      // assert
      expect(actual).to.deep.equal([0, 2, 5]);
    });
  });

  describe("convertToElmToken", () => {
    it("should return token with code returned by codeHelper.codeBetween", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.codeBetween = () => "foo";

      // act
      let actual = tokenizerImp.convertToElmToken(mockCodeHelper, [], <PartialElmToken>{});

      // assert
      expect(actual.code).to.equal("foo");
    });

    it("should return token with end returned by convertIndexToLocation for endIndex", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.codeBetween = () => "foo";
      let lineMap = [10];
      let mockConvertIndex = Sinon.stub();
      mockConvertIndex.withArgs(lineMap, 123).returns(456);
      tokenizerImp.convertIndexToLocation = mockConvertIndex;

      // act
      let actual = tokenizerImp.convertToElmToken(mockCodeHelper, lineMap, <PartialElmToken>{endIndex: 123});

      // assert
      expect(actual.end).to.equal(456);
    });

    it("should return token with supplied identifier", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.codeBetween = () => "foo";

      // act
      let actual = tokenizerImp.convertToElmToken(mockCodeHelper, [], <PartialElmToken>{identifier: "bar"});

      // assert
      expect(actual.identifier).to.equal("bar");
    });

    it("should return token with start returned by convertIndexToLocation for startIndex", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.codeBetween = () => "foo";
      let lineMap = [10];
      let mockConvertIndex = Sinon.stub();
      mockConvertIndex.withArgs(lineMap, 123).returns(456);
      tokenizerImp.convertIndexToLocation = mockConvertIndex;

      // act
      let actual = tokenizerImp.convertToElmToken(mockCodeHelper, lineMap, <PartialElmToken>{startIndex: 123});

      // assert
      expect(actual.start).to.equal(456);
    });

    it("should return token with supplied token type", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.codeBetween = () => "foo";

      // act
      let actual = tokenizerImp.convertToElmToken(mockCodeHelper, [], <PartialElmToken>{tokenType: ElmTokenType.Module});

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Module);
    });
  });


  describe("convertIndexToLocation", () => {
    it("should return 1 as the line number when the line map is empty", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([], 5);

      // assert
      expect(actual.lineNumber).to.equal(1);
    });

    it("should return max line number when the index is larger than any value in the line map", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([2 , 10], 11);

      // assert
      expect(actual.lineNumber).to.equal(3);
    });

    it("should return line number when the index is contained in the line map", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([2 , 10], 4);

      // assert
      expect(actual.lineNumber).to.equal(2);
    });

    it("should return the column number when the line map is empty", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([], 5);

      // assert
      expect(actual.columnNumber).to.equal(4);
    });

    it("should return correct column number when the index is smaller than any value in the line map", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([2 , 10], 1);

      // assert
      expect(actual.columnNumber).to.equal(1);
    });

    it("should return correct column number when the index is larger than any value in the line map", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([2 , 10], 11);

      // assert
      expect(actual.columnNumber).to.equal(1);
    });

    it("should return line number when the index is contained in the line map", () => {
      // arrange

      // act
      let actual = tokenizerImp.convertIndexToLocation([2 , 10], 4);

      // assert
      expect(actual.columnNumber).to.equal(2);
    });
  });

  describe("read", () => {
    it("should return undefined when the file undefined", () => {
      // arrange
      mockUtil.read = () => undefined;

      // act
      let actual = tokenizerImp.read("abc");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when the file is empty", () => {
      // arrange
      mockUtil.read = () => "";

      // act
      let actual = tokenizerImp.read("abc");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return file contents with '\r' removed", () => {
      // arrange
      mockUtil.read = () => "foo\r\nbar\r";

      // act
      let actual = tokenizerImp.read("abc");

      // assert
      expect(actual).to.equal("foo\nbar");
    });
  });


  describe("tokenize", () => {
    it("should return no tokens when the file undefined", () => {
      // arrange
      tokenizerImp.read = () => undefined;

      // act
      let actual = tokenizerImp.tokenize("abc");

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return no tokens when the file is empty", () => {
      // arrange
      tokenizerImp.read = () => "";

      // act
      let actual = tokenizerImp.tokenize("abc");

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should call tokenizeCode with a line map built from the elm code file", () => {
      // arrange
      tokenizerImp.read = () => "foo";
      let mockTokenizeCode = Sinon.spy();
      tokenizerImp.tokenizeCode = mockTokenizeCode;
      let expected = "bar";
      let mockBuildLineMap = Sinon.stub();
      mockBuildLineMap.returns("bar");
      tokenizerImp.buildLineMap = mockBuildLineMap;

      // act
      tokenizerImp.tokenize("abc");

      // assert
      expect(mockTokenizeCode).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call tokenizeCode with the code helper built from the elm code file", () => {
      // arrange
      tokenizerImp.read = () => "foo";
      let mockTokenizeCode = Sinon.spy();
      tokenizerImp.tokenizeCode = mockTokenizeCode;
      let expected = <ElmCodeHelper> { maxIndex: 123 };
      mockMakeElmCodeHelper.returns(expected);

      // act
      tokenizerImp.tokenize("abc");

      // assert
      expect(mockTokenizeCode).to.have.been.calledWith(expected, Sinon.match.any);
    });
  });

  describe("tokenizeCode", () => {
    it("should return empty token list when the makIndex is 0", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {maxIndex: 0};

      // act
      let actual = tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should call findNextWord to get the next candidate token", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 3 };
      let mockFindNextWord = Sinon.mock();
      mockFindNextWord.returns({nextIndex: 3, word: "foo"});
      mockCodeHelper.findNextWord = mockFindNextWord;

      // act
      tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(mockFindNextWord).to.have.been.calledWith(0, false);
    });

    it("should not call tokenizeWord when findNextWord.nextIndex is equal to the maxIndex", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 3 };
      let mockFindNextWord = Sinon.mock();
      mockFindNextWord.returns({nextIndex: 3, word: "foo"});
      mockCodeHelper.findNextWord = mockFindNextWord;
      tokenizerImp.tokenizeWord = Sinon.spy();

      // act
      tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(tokenizerImp.tokenizeWord).not.to.have.been.called;
    });

    it("should call findNextWord to get the next candidate token", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 100 };
      let mockFindNextWord = Sinon.mock();
      mockFindNextWord.returns({nextIndex: 3, word: "foo"});
      mockCodeHelper.findNextWord = mockFindNextWord;
      tokenizerImp.tokenizeWord = () => undefined;

      // act
      tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(mockFindNextWord).to.have.been.calledWith(0, false);
    });

    it("should not call convertToElmToken when tokenizeWord returns undefined", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 100 };
      let mockFindNextWord = Sinon.mock();
      mockFindNextWord.returns({nextIndex: 3, word: "foo"});
      mockCodeHelper.findNextWord = mockFindNextWord;
      tokenizerImp.tokenizeWord = () => undefined;
      tokenizerImp.convertToElmToken = Sinon.spy();

      // act
      tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(tokenizerImp.convertToElmToken).not.to.have.been.called;
    });

    it("should not call convertToElmToken when token is whitespace", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 100 };
      let mockFindNextWord = Sinon.mock();
      mockFindNextWord.returns({nextIndex: 3, word: "foo"});
      mockCodeHelper.findNextWord = mockFindNextWord;
      tokenizerImp.tokenizeWord = () => <PartialElmToken> {tokenType: ElmTokenType.Whitespace};
      tokenizerImp.convertToElmToken = Sinon.spy();

      // act
      tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(tokenizerImp.convertToElmToken).not.to.have.been.called;
    });

    it("should return tokens converted by convertToElmToken", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 100 };
      let mockFindNextWord = Sinon.stub();
      mockFindNextWord.withArgs(0, false).returns("module");
      mockCodeHelper.findNextWord = mockFindNextWord;
      let partialToken = <PartialElmToken> {};
      tokenizerImp.tokenizeWord = () => partialToken;
      let mockConvertToElmToken = Sinon.stub();
      let expected = <ElmToken> {};
      mockConvertToElmToken.returns(expected);
      tokenizerImp.convertToElmToken = mockConvertToElmToken;

      // act
      let actual = tokenizerImp.tokenizeCode(mockCodeHelper, []);

      // assert
      expect(actual).to.deep.equal([expected]);
    });
  });

  describe("tokenizeWord", () => {
    it("should call tokenizeWhitespace when the word is ' '", () => {
      // arrange
      let wordResult = <FindWordResult> { nextIndex: 1, word: " "};
      tokenizerImp.tokenizeWhitespace = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(<ElmCodeHelper>{}, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeWhitespace).to.have.been.calledWith(123, wordResult);
    });

    it("should call tokenizeWhitespace when the word is '\n'", () => {
      // arrange
      let wordResult = <FindWordResult> { nextIndex: 1, word: "\n"};
      tokenizerImp.tokenizeWhitespace = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(<ElmCodeHelper>{}, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeWhitespace).to.have.been.calledWith(123, wordResult);
    });

    it("should call tokenizeComment when the word is a comment", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => true;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeComment = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeComment).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });

    it("should call tokenizeType when the word is 'type'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => false;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "type"};
      tokenizerImp.tokenizeType = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeType).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });

    it("should call tokenizeType when the word is 'import'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => false;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "import"};
      tokenizerImp.tokenizeImport = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeImport).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });

    it("should call tokenizePort when the word is 'port'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => false;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "port"};
      tokenizerImp.tokenizePort = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizePort).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });

    it("should call tokenizeEffect when the word is 'effect'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => false;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "effect"};
      tokenizerImp.tokenizeEffect = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeEffect).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });

    it("should call tokenizeModule when the word is 'module'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => false;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "module"};
      tokenizerImp.tokenizeModule = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeModule).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });

    it("should call tokenizeFunction when the word is not a elm definition keyword", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.isWordComment = () => false;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeFunction = Sinon.spy();

      // act
      tokenizerImp.tokenizeWord(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeFunction).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });
  });

  describe("tokenizeComment", () => {
    it("should return comment token when the code helper cannot find the end of the comment", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findEndComment = () => 456;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeComment(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Comment);
    });

    it("should return comment token with token type of comment when the code helper finds the end of the comment", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {maxIndex: 456};
      mockCodeHelper.findEndComment = () => 456;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeComment(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Comment);
    });

    it("should return comment token with supplied start index when the code helper finds the end of the comment", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findEndComment = () => 456;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeComment(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return comment token with end index of comment when the code helper finds the end of the comment", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findEndComment = () => 456;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeComment(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.endIndex).to.equal(456);
    });

    it("should return comment token with identifier of empty string when the code helper finds the end of the comment", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findEndComment = () => 456;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeComment(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.identifier).to.equal("");
    });
  });

  describe("tokenizeEffect", () => {
    it("should call tokenizeWord when the next word is 'module'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "module"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeWord = Sinon.spy();

      // act
      tokenizerImp.tokenizeEffect(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeWord).to.have.been.calledWith(mockCodeHelper, 123, nextWord);
    });

    it("should call tokenizeFunction when the next word is not 'module'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeFunction = Sinon.spy();

      // act
      tokenizerImp.tokenizeEffect(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeFunction).to.have.been.calledWith(mockCodeHelper, 123, wordResult);
    });
  });

  describe("tokenizeFunction", () => {
    it("should call tokenizeUntilEndOfBlock with token type TypedModuleFunction when the next word is ':'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: ":"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeUntilEndOfBlock = Sinon.spy();

      // act
      tokenizerImp.tokenizeFunction(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeUntilEndOfBlock)
        .to.have.been.calledWith(mockCodeHelper, 123, wordResult, ElmTokenType.TypedModuleFunction, "=");
    });

    it("should call tokenizeUntilEndOfBlock with token type UntypedModuleFunction when the next word is not ':'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeUntilEndOfBlock = Sinon.spy();

      // act
      tokenizerImp.tokenizeFunction(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeUntilEndOfBlock)
        .to.have.been.calledWith(mockCodeHelper, 123, wordResult, ElmTokenType.UntypedModuleFunction, "=");
    });
  });

  describe("tokenizeImport", () => {
    it("should return import token with token type of import", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Import);
    });

    it("should return import token with supplied start index", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return undefined when the code helper cannot find the end of the exposed functions", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "exposing"};
      mockCodeHelper.findNextWord = () => nextWord;
      mockCodeHelper.findClose = () => undefined;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return import token with end index of exposing when the code helper finds the end of the exposed functions", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "exposing"};
      mockCodeHelper.findNextWord = () => nextWord;
      mockCodeHelper.findClose = () => 456;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.endIndex).to.equal(456);
    });

    it("should return import token with end index", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.endIndex).to.equal(1);
    });

    it("should return import token with identifier as next word", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.identifier).to.equal("bar");
    });

    it("should return import token with formatted identifier when alias exists", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let mockFindNextWord = Sinon.stub();
      mockCodeHelper.findNextWord = mockFindNextWord;
      let identifierWord = { nextIndex: 2, word: "bar"};
      mockFindNextWord.onFirstCall().returns(identifierWord);
      mockFindNextWord.onSecondCall().returns({nextIndex: 3, word: "as"});
      let aliasWord = {nextIndex: 4, word: "baz"};
      mockFindNextWord.onThirdCall().returns(aliasWord);
      mockFindNextWord.returns({nextIndex: 5, word: "qux"});

      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeImport(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.identifier).to.equal("bar as baz");
    });
  });

  describe("tokenizeModule", () => {
    it("should return undefined when the code helper cannot find the end of the module declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => undefined;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeModule(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return module token with token type of module when the code helper finds the end of the module declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeModule(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Module);
    });

    it("should return module token with supplied start index when the code helper finds the end of the module declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeModule(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return module token with end index of module when the code helper finds the end of the module declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeModule(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.endIndex).to.equal(456);
    });

    it("should return module token with identifier from next word when the code helper finds the end of the module declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeModule(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.identifier).to.equal("bar");
    });
  });

  describe("tokenizePort", () => {
    it("should call tokenizeWord with token type Port when the next word is 'module'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "module"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeWord = Sinon.spy();

      // act
      tokenizerImp.tokenizePort(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeWord)
        .to.have.been.calledWith(mockCodeHelper, 123, nextWord);
    });

    it("should call tokenizeUntilEndOfBlock with token type UntypedModulePort when the next word is not 'module'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeUntilEndOfBlock = Sinon.spy();

      // act
      tokenizerImp.tokenizePort(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeUntilEndOfBlock)
        .to.have.been.calledWith(mockCodeHelper, 123, nextWord, ElmTokenType.Port, ":");
    });
  });

  describe("tokenizeType", () => {
    it("should return undefined when the code helper cannot find the end of the type alias declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => undefined;
      let mockFindNextWord = Sinon.stub();
      mockCodeHelper.findNextWord = mockFindNextWord;
      let aliasWord = { nextIndex: 2, word: "alias"};
      mockFindNextWord.onFirstCall().returns(aliasWord);
      let nextWord = { nextIndex: 2, word: "bar"};
      mockFindNextWord.returns(nextWord);
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeType(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return type token with token type of TypeAlias when the code helper finds the end of the type declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let mockFindNextWord = Sinon.stub();
      mockCodeHelper.findNextWord = mockFindNextWord;
      let aliasWord = { nextIndex: 2, word: "alias"};
      mockFindNextWord.onFirstCall().returns(aliasWord);
      let nextWord = { nextIndex: 2, word: "bar"};
      mockFindNextWord.returns(nextWord);
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeType(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.TypeAlias);
    });

    it("should return type token with supplied start index when the code helper finds the end of the type declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let mockFindNextWord = Sinon.stub();
      mockCodeHelper.findNextWord = mockFindNextWord;
      let aliasWord = { nextIndex: 2, word: "alias"};
      mockFindNextWord.onFirstCall().returns(aliasWord);
      let nextWord = { nextIndex: 2, word: "bar"};
      mockFindNextWord.returns(nextWord);
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeType(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return type token with end index of type when the code helper finds the end of the type declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let mockFindNextWord = Sinon.stub();
      mockCodeHelper.findNextWord = mockFindNextWord;
      let aliasWord = { nextIndex: 2, word: "alias"};
      mockFindNextWord.onFirstCall().returns(aliasWord);
      let nextWord = { nextIndex: 2, word: "bar"};
      mockFindNextWord.returns(nextWord);
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeType(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.endIndex).to.equal(456);
    });

    it("should return type token with identifier from next word when the code helper finds the end of the type declaration", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findClose = () => 456;
      let mockFindNextWord = Sinon.stub();
      mockCodeHelper.findNextWord = mockFindNextWord;
      let aliasWord = { nextIndex: 2, word: "alias"};
      mockFindNextWord.onFirstCall().returns(aliasWord);
      let nextWord = { nextIndex: 2, word: "bar"};
      mockFindNextWord.returns(nextWord);
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeType(mockCodeHelper, 123, wordResult);

      // assert
      expect(actual.identifier).to.equal("bar");
    });

    it("should call tokenizeUntilEndOfBlock with token type of Type when the next word is not 'alias'", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      let nextWord = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findNextWord = () => nextWord;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};
      tokenizerImp.tokenizeUntilEndOfBlock = Sinon.spy();

      // act
      tokenizerImp.tokenizeType(mockCodeHelper, 123, wordResult);

      // assert
      expect(tokenizerImp.tokenizeUntilEndOfBlock)
        .to.have.been.calledWith(mockCodeHelper, 123, nextWord, ElmTokenType.Type, "=");
    });
  });

  describe("tokenizeUntilEndOfBlock", () => {
    it("should return undefined when the code helper cannot find start char", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => undefined;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return token of supplied token type when the code helper does not find the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      mockCodeHelper.findUntilEndOfBlock = () => undefined;
      let wordResult = <FindWordResult> {nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Module);
    });

    it("should return token with supplied start index when the code helper does not find the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      mockCodeHelper.findUntilEndOfBlock = () => undefined;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return token with end index of from codeHelper.maxIndex when the code helper does not find the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> { maxIndex: 789};
      mockCodeHelper.findChar = () => 456;
      mockCodeHelper.findUntilEndOfBlock = () => undefined;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.endIndex).to.equal(789);
    });

    it("should return token with identifier from supplied word result when the code helper does not find the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      mockCodeHelper.findUntilEndOfBlock = () => undefined;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.identifier).to.equal("foo");
    });

    it("should return token of supplied token type when the code helper finds the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      let endOfBlock = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findUntilEndOfBlock = () => endOfBlock;
      let wordResult = <FindWordResult> {nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Module);
    });

    it("should return token with supplied start index when the code helper finds the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      let endOfBlock = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findUntilEndOfBlock = () => endOfBlock;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return token with end index of from block result when the code helper finds the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      let endOfBlock = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findUntilEndOfBlock = () => endOfBlock;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.endIndex).to.equal(2);
    });

    it("should return token with identifier from block result when the code helper finds the end of the block", () => {
      // arrange
      let mockCodeHelper = <ElmCodeHelper> {};
      mockCodeHelper.findChar = () => 456;
      let endOfBlock = { nextIndex: 2, word: "bar"};
      mockCodeHelper.findUntilEndOfBlock = () => endOfBlock;
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = tokenizerImp.tokenizeUntilEndOfBlock(mockCodeHelper, 123, wordResult, ElmTokenType.Module, "~");

      // assert
      expect(actual.identifier).to.equal("bar");
    });
  });

  describe("tokenizeWhitespace", () => {
    it("should return whitespace token with token type of whitespace", () => {
      // act
      let actual = tokenizerImp.tokenizeWhitespace(123, { nextIndex: 1, word: "foo"});

      // assert
      expect(actual.tokenType).to.equal(ElmTokenType.Whitespace);
    });

    it("should return whitespace token with supplied start index", () => {
      // act
      let actual = tokenizerImp.tokenizeWhitespace(123, { nextIndex: 1, word: "foo"});

      // assert
      expect(actual.startIndex).to.equal(123);
    });

    it("should return whitespace token with end index of zero", () => {
      // act
      let actual = tokenizerImp.tokenizeWhitespace(123, { nextIndex: 1, word: "foo"});

      // assert
      expect(actual.endIndex).to.equal(0);
    });

    it("should return whitespace token with identifier of empty string", () => {
      // act
      let actual = tokenizerImp.tokenizeWhitespace(123, { nextIndex: 1, word: "foo"});

      // assert
      expect(actual.identifier).to.equal("");
    });
  });
});
