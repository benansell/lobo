"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createElmTokenizer, ElmToken, ElmTokenizer, ElmTokenizerImp, ElmTokenType, PartialElmToken} from "../../../lib/elm-tokenizer";
import {ElmCodeHelper} from "../../../lib/elm-code-helper";
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
});
