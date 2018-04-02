"use strict";

import * as chai from "chai";
import {makeElmCodeHelper, ElmCodeHelper, ElmCodeHelperImp, FindWordResult} from "../../../lib/elm-code-helper";

let expect = chai.expect;

describe("lib elm-code-helper", () => {
  describe("makeElmCodeHelper", () => {
    it("should return elm code helper", () => {
      // act
      let actual: ElmCodeHelper = makeElmCodeHelper("foo");

      // assert
      expect(actual).to.exist;
    });
  });

  describe("buildCommentMap", () => {
    it("should return an empty map when there are no comments", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("foo bar");

      // assert
      expect(actual).to.deep.equal([]);
    });

    it("should return map containing line comments in supplied code when the comment does not end in '\n'", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("--foo bar");

      // assert
      expect(actual[0].fromIndex).to.equal(0);
      expect(actual[0].toIndex).to.equal(8);
    });

    it("should return map containing line comments in supplied code when the comment ends in '\n'", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("--foo\n");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 4});
    });

    it("should return map containing block comments containing spaces in supplied code when the comment does not end in '\n'", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-foo-}");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 6});
    });

    it("should return map containing block comments in supplied code when the comment ends in '\n'", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-foo bar-}\n");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 10});
    });

    it("should return map containing line comments in supplied code when they contain spaces", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("--foo bar");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 8});
    });

    it("should return map containing block comments in supplied code when they contain spaces", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-foo bar-}");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 10});
    });

    it("should return map containing all line comments in supplied code", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("--foo\nbar\n--baz");

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 4});
      expect(actual[1]).to.deep.equal({fromIndex: 10, toIndex: 14});
    });

    it("should return map containing all block comments in supplied code", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-foo-}bar{-baz-}");

      // assert
      expect(actual.length).to.equal(2);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 6});
      expect(actual[1]).to.deep.equal({fromIndex: 10, toIndex: 16});
    });

    it("should return map containing block comments in supplied code when block contains line comment", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-\n--foo\n-}");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 10});
    });

    it("should return map containing block comments in supplied code when block contains block comment", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-\n{-foo-}\n-}");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 12});
    });

    it("should return map containing block comments in supplied code when there is no end comment", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.buildCommentMap("{-\nfoo\nbar");

      // assert
      expect(actual.length).to.equal(1);
      expect(actual[0]).to.deep.equal({fromIndex: 0, toIndex: 9});
    });
  });

  describe("codeBetween", () => {
    it("should return substring between the supplied indexes", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.codeBetween(4, 6);

      // assert
      expect(actual).to.equal("bar");
    });
  });

  describe("exists", () => {
    it("should return -1 when the search term does not exist", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.exists(0, ["qux"]);

      // assert
      expect(actual).to.equal(-1);
    });

    it("should return -1 when the search term does not exist at the index", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.exists(1, ["foo"]);

      // assert
      expect(actual).to.equal(-1);
    });

    it("should return -1 when the search term does not exist at the index but is at another index", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.exists(1, ["bar"]);

      // assert
      expect(actual).to.equal(-1);
    });

    it("should return the search term index when the search term exists", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.exists(4, ["foo", "bar"]);

      // assert
      expect(actual).to.equal(1);
    });
  });

  describe("existsAt", () => {
    it("should return false when the search term does not exist", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.existsAt(0, "qux");

      // assert
      expect(actual).to.equal(false);
    });

    it("should return false when the search term does not exist at the index", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.existsAt(1, "foo");

      // assert
      expect(actual).to.equal(false);
    });

    it("should return false when the search term does not exist at the index but is at another index", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.existsAt(1, "bar");

      // assert
      expect(actual).to.equal(false);
    });

    it("should return true when the search term exists", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.existsAt(4, "bar");

      // assert
      expect(actual).to.equal(true);
    });
  });

  describe("findIncludingComments", () => {
    it("should return undefined when there is no match", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");
      let isMatch = () => false;

      // act
      let actual = codeHelper.findIncludingComments(0, isMatch);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no match after the start index", () => {
      // arrange
      let code = "* foo bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*";

      // act
      let actual = codeHelper.findIncludingComments(1, isMatch);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return match result when there is a match", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");
      let isMatch = (x) => x === 10 ? "found" : undefined;

      // act
      let actual = codeHelper.findIncludingComments(0, isMatch);

      // assert
      expect(actual).to.equal("found");
    });
  });

  describe("findExcludingComments", () => {
    it("should return undefined when there is no match", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");
      let isMatch = () => false;

      // act
      let actual = codeHelper.findExcludingComments(0, isMatch);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no match after the start index", () => {
      // arrange
      let code = "* foo bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*";

      // act
      let actual = codeHelper.findExcludingComments(1, isMatch);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when there is no match outside comments", () => {
      // arrange
      let code = "foo {-*-} bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*";

      // act
      let actual = codeHelper.findExcludingComments(0, isMatch);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return match result when there is a match outside comments", () => {
      // arrange
      let code = "foo {- -} * bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*" ? "found" : undefined;

      // act
      let actual = codeHelper.findExcludingComments(0, isMatch);

      // assert
      expect(actual).to.equal("found");
    });

    it("should return match result when there is a match outside comments", () => {
      // arrange
      let code = "foo {- -} * bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*" ? "found" : undefined;

      // act
      let actual = codeHelper.findExcludingComments(0, isMatch);

      // assert
      expect(actual).to.equal("found");
    });

    it("should return match result when there is a match outside comments and start is inside a comment block", () => {
      // arrange
      let code = "foo {- -} * bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*" ? "found" : undefined;

      // act
      let actual = codeHelper.findExcludingComments(6, isMatch);

      // assert
      expect(actual).to.equal("found");
    });

    it("should return match result when there is a match outside comments and start is after a comment block", () => {
      // arrange
      let code = "foo {- -} * bar";
      let codeHelper = new ElmCodeHelperImp(code);
      let isMatch = (x) => code[x] === "*" ? "found" : undefined;

      // act
      let actual = codeHelper.findExcludingComments(8, isMatch);

      // assert
      expect(actual).to.equal("found");
    });
  });

  describe("findChar", () => {
    it("should return undefined when the search char does not exist", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar");

      // act
      let actual = codeHelper.findChar(0, "*");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when the search char exists in a comment and comments are excluded", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {-*-} bar");

      // act
      let actual = codeHelper.findChar(0, "*", false);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return index when the search char exists in a comment and comments are included", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {-*-} bar");

      // act
      let actual = codeHelper.findChar(0, "*", true);

      // assert
      expect(actual).to.equal(6);
    });

    it("should return index of search char when the search char does exists and comments are excluded", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} * bar");

      // act
      let actual = codeHelper.findChar(0, "*", false);

      // assert
      expect(actual).to.equal(9);
    });

    it("should return index of search char when the search char does exists and comments are included", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} * bar");

      // act
      let actual = codeHelper.findChar(0, "*", true);

      // assert
      expect(actual).to.equal(9);
    });
  });

  describe("findClose", () => {
    it("should return undefined when close does not exist", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return undefined when close exists in a comment and comments are excluded", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {- !> -} bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", false);

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return index when close exists in a comment and comments are included", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {- !> -} bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", true);

      // assert
      expect(actual).to.equal(7);
    });

    it("should return index of close when close exists and comments are excluded", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} !> bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", false);

      // assert
      expect(actual).to.equal(9);
    });

    it("should return index of close when close exists and comments are included", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} !> bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", true);

      // assert
      expect(actual).to.equal(9);
    });

    it("should return index of close when open and close exists and comments are excluded", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} <! !> bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", false);

      // assert
      expect(actual).to.equal(12);
    });

    it("should return index of close when open and close exists and comments are included", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} <! !> bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", true);

      // assert
      expect(actual).to.equal(12);
    });

    it("should return index of close when multiple open and close exists and comments are excluded", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} <!<! !>!> bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", false);

      // assert
      expect(actual).to.equal(16);
    });

    it("should return index of close when multiple open and close exists and comments are included", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} <!<! !>!> bar");

      // act
      let actual = codeHelper.findClose(0, "<!", "!>", true);

      // assert
      expect(actual).to.equal(16);
    });
  });

  describe("findEndComment", () => {
    it("should return max index when word is a start block comment and there is no end comment", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {- bar");

      // act
      let actual = codeHelper.findEndComment({nextIndex: 6, word: "{-"});

      // assert
      expect(actual).to.equal(9);
    });

    it("should return max index when word is a start line comment and there is no '\n'", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo -- bar");

      // act
      let actual = codeHelper.findEndComment({nextIndex: 6, word: "--"});

      // assert
      expect(actual).to.equal(9);
    });

    it("should return index of close when word is a start block comment and there is an end comment", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {--} bar");

      // act
      let actual = codeHelper.findEndComment({nextIndex: 6, word: "{-"});

      // assert
      expect(actual).to.equal(7);
    });

    it("should return index of line end when word is a start line comment and there is an '\n'", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo -- bar\n baz");

      // act
      let actual = codeHelper.findEndComment({nextIndex: 6, word: "--"});

      // assert
      expect(actual).to.equal(9);
    });
  });

  describe("findNextWord", () => {
    it("should return word when there is a single word using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo");

      // act
      let actual = codeHelper.findNextWord(0);

      // assert
      expect(actual).to.deep.equal({nextIndex: 3, word: "foo"});
    });

    it("should return word when separated by custom delimiter", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo_bar_baz");

      // act
      let actual = codeHelper.findNextWord(0, true, ["_"]);

      // assert
      expect(actual).to.deep.equal({nextIndex: 3, word: "foo"});
    });

    it("should return first word when separated by a space and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.findNextWord(0);

      // assert
      expect(actual).to.deep.equal({nextIndex: 3, word: "foo"});
    });

    it("should return first word when separated by '\n' and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo\nbar\nbaz");

      // act
      let actual = codeHelper.findNextWord(0);

      // assert
      expect(actual).to.deep.equal({nextIndex: 3, word: "foo"});
    });

    it("should return space when space is the next word and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.findNextWord(3);

      // assert
      expect(actual).to.deep.equal({nextIndex: 4, word: " "});
    });

    it("should return '\n' when '\n' is the next word and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo\nbar\nbaz");

      // act
      let actual = codeHelper.findNextWord(3);

      // assert
      expect(actual).to.deep.equal({nextIndex: 4, word: "\n"});
    });

    it("should return next word when separated by a space and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo bar baz");

      // act
      let actual = codeHelper.findNextWord(4);

      // assert
      expect(actual).to.deep.equal({nextIndex: 7, word: "bar"});
    });

    it("should return next word when separated by '\n' and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo\nbar\nbaz");

      // act
      let actual = codeHelper.findNextWord(4);

      // assert
      expect(actual).to.deep.equal({nextIndex: 7, word: "bar"});
    });

    it("should return next word ignoring comments when using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {-bar-}baz");

      // act
      let actual = codeHelper.findNextWord(4);

      // assert
      expect(actual).to.deep.equal({nextIndex: 14, word: "baz"});
    });

    it("should return next word including comments when skip comments is false and using default delimiters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo {-bar-}baz");

      // act
      let actual = codeHelper.findNextWord(4, false);

      // assert
      expect(actual).to.deep.equal({nextIndex: 11, word: "{-bar-}"});
    });

    it("should return empty word when there are no more words after index", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("foo");

      // act
      let actual = codeHelper.findNextWord(3, false);

      // assert
      expect(actual).to.deep.equal({nextIndex: 3, word: ""});
    });
  });

  describe("findUntilEndOfBlock", () => {
    it("should return word result up to end of the block when new line is not followed by a space", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp(" foo\nbar");
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = codeHelper.findUntilEndOfBlock(0, wordResult);

      // assert
      expect(actual).to.deep.equal({nextIndex: 3, word: "foo"});
    });

    it("should return word result up to end of the block when new line is followed by a space", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp(" foo\n bar");
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = codeHelper.findUntilEndOfBlock(0, wordResult);

      // assert
      expect(actual).to.deep.equal({nextIndex: 8, word: "foo"});
    });

    it("should return word result up to end of the block", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp(" foo\n bar\n\nbaz");
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = codeHelper.findUntilEndOfBlock(0, wordResult);

      // assert
      expect(actual).to.deep.equal({nextIndex: 8, word: "foo"});
    });

    it("should return word result up to end of file when there is no end to the block", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp(" foo\n bar\n baz");
      let wordResult = <FindWordResult> { nextIndex: 1, word: "foo"};

      // act
      let actual = codeHelper.findUntilEndOfBlock(0, wordResult);

      // assert
      expect(actual).to.deep.equal({nextIndex: 13, word: "foo"});
    });
  });

  describe("isWordComment", () => {
    it("should return false when the supplied word is longer 2 characters", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.isWordComment("foo");

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the supplied word is 2 characters and not a comment", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.isWordComment("fo");

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the supplied word is '--", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.isWordComment("--");

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the supplied word is '{-", () => {
      // arrange
      let codeHelper = new ElmCodeHelperImp("");

      // act
      let actual = codeHelper.isWordComment("{-");

      // assert
      expect(actual).to.be.true;
    });
  });

});
