"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {createTestResultFormatter, TestResultFormatter, TestResultFormatterImp} from "../../../lib/test-result-formatter";
import {Comparer} from "../../../lib/comparer";
import {Util} from "../../../lib/util";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib test-result-formatter", () => {
  let RewiredPlugin = rewire("../../../lib/test-result-formatter");
  let reporter: TestResultFormatterImp;
  let mockComparer: Comparer;
  let mockLogger: { log(message: string): void };
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredPlugin.__get__("TestResultFormatterImp");
    mockComparer = <Comparer> {diff: Sinon.stub()};
    mockLogger = {log: Sinon.spy()};
    mockUtil = <Util> {};
    mockUtil.padRight = x => x;
    reporter = new rewiredImp(mockComparer);
  });

  describe("createTestResultFormatter", () => {
    it("should return formatter", () => {
      // act
      let actual: TestResultFormatter = createTestResultFormatter();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("formatFailure", () => {
    let revertChalk: () => void;
    let mockYellow: SinonStub;

    beforeEach(() => {
      mockYellow = Sinon.stub();
      mockYellow.callsFake(x => x);
      revertChalk = RewiredPlugin.__set__({Chalk: {yellow: mockYellow}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should style the whole message as yellow when there are no '│'", () => {
      // act
      reporter.formatFailure("foo\n bar\n baz\n", 123);

      // assert
      expect(mockYellow).to.have.been.calledWith("foo\n bar\n baz\n");
    });

    it("should not style the message as yellow when there an unexpected number of lines", () => {
      // act
      reporter.formatFailure("foo\n│ bar\n", 123);

      // assert
      expect(mockYellow).not.to.have.been.called;
    });

    it("should return the message unaltered when there an unexpected number of lines", () => {
      // arrange
      let expected = "foo\n│ bar\n";

      // act
      let actual = reporter.formatFailure(expected, 123);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should style the failure message as yellow when there are '│'", () => {
      // act
      reporter.formatFailure("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(mockYellow).to.have.been.calledWith("bar");
    });

    it("should not replace failure markers when '│ ' is missing", () => {
      // act
      let actual = reporter.formatFailure("foo\n╷\n│bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("foo\n╷\n│bar\n╵\nbaz");
    });

    it("should replace failure markers '╷', │' and '╵' with '┌','│' and'└' ", () => {
      // act
      let actual = reporter.formatFailure("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("┌ foo\n│\n│ bar\n│\n└ baz");
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equal'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalDicts'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalDicts'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalDicts bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalLists'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalLists'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalLists bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalSets'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalSets'", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalSets bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with message as lines", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with supplied maxLength", () => {
      // arrange
      reporter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>reporter.formatExpectEqualFailure).returns([]);

      // act
      reporter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(reporter.formatExpectEqualFailure).to.have.been.calledWith(Sinon.match.any, 123);
    });
  });

  describe("formatExpectEqualFailure", () => {
    let revertChalk: () => void;

    beforeEach(() => {
      revertChalk = RewiredPlugin.__set__({Chalk: {red: x => x}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should return lines with left diff hint from compare.diff added", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], 123);

      // assert
      expect(actual).to.include("│ ^^^");
    });

    it("should return lines with right diff hint from compare.diff added", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], 123);

      // assert
      expect(actual).to.include("  ^^^");
    });

    it("should return lines without splitting when length is under maxLength", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ foo", "│", "│ bar", "│", "└ baz"], 6);

      // assert
      expect(actual.length).to.equal(8);
      expect(actual[0]).to.equal("┌ foo");
      expect(actual[1]).to.equal("│ ^^^");
      expect(actual[2]).to.equal("");
      expect(actual[3]).to.equal("│ bar");
      expect(actual[4]).to.equal("│");
      expect(actual[5]).to.equal("└ baz");
      expect(actual[6]).to.equal("  ^^^");
      expect(actual[7]).to.equal("");
    });

    it("should return split lines when length is over max length", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^^^^", right: "^^^"});

      // act
      let actual = reporter.formatExpectEqualFailure(["┌ fooabc", "│", "│ bar", "│", "└ baz"], 6);

      // assert
      expect(actual.length).to.equal(10);
      expect(actual[0]).to.equal("┌ foo");
      expect(actual[1]).to.equal("│ ^^^");
      expect(actual[2]).to.equal("│ abc");
      expect(actual[3]).to.equal("│ ^^^");
      expect(actual[4]).to.equal("");
      expect(actual[5]).to.equal("│ bar");
      expect(actual[6]).to.equal("│");
      expect(actual[7]).to.equal("└ baz");
      expect(actual[8]).to.equal("  ^^^");
      expect(actual[9]).to.equal("");
    });
  });

  describe("chunkLine", () => {
    let revertChalk: () => void;
    let mockRed;

    beforeEach(() => {
      mockRed = Sinon.stub();
      revertChalk = RewiredPlugin.__set__({Chalk: {red: mockRed}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should highlight diff with red style", () => {
      // act
      reporter.chunkLine("foo", " ^^^", 10, "x", "y");

      // assert
      expect(mockRed).to.have.been.calledWith("^^^");
    });
  });

  describe("formatMessage", () => {
    it("should return empty string when message is undefined", () => {
      // act
      let actual = reporter.formatMessage(undefined, "?");

      // assert
      expect(actual).to.equal("");
    });

    it("should return string with specified padding value added on each line", () => {
      // act
      let actual = reporter.formatMessage("foo\nbar", "??");

      // assert
      expect(actual).to.equal("??foo\n??bar");
    });
  });
});
