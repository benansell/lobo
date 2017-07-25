"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {createTestResultFormatter, TestResultFormatter, TestResultFormatterImp} from "../../../lib/test-result-formatter";
import {Comparer} from "../../../lib/comparer";
import {TestReportSkippedLeaf, TestRunLeaf} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib test-result-formatter", () => {
  let RewiredFormatter = rewire("../../../lib/test-result-formatter");
  let formatter: TestResultFormatterImp;
  let mockComparer: Comparer;
  let mockLogger: { log(message: string): void };

  beforeEach(() => {
    let rewiredImp = RewiredFormatter.__get__("TestResultFormatterImp");
    mockComparer = <Comparer> {diff: Sinon.stub()};
    mockLogger = {log: Sinon.spy()};
    formatter = new rewiredImp(mockComparer);
  });

  describe("createTestResultFormatter", () => {
    it("should return formatter", () => {
      // act
      let actual: TestResultFormatter = createTestResultFormatter();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("formatNotRun", () => {
    it("should return the reason padded by the supplied value and 2 spaces", () => {
      // act
      let actual = formatter.formatNotRun(<TestRunLeaf<TestReportSkippedLeaf>> {result: {reason: "foo"}}, "#");

      // assert
      expect(actual).to.match(/ {2}#foo/);
    });

    it("should return the reason prefixed with a new line", () => {
      // arrange
      let revert = RewiredFormatter.__with__({os: {EOL: "::"}});
      // act
      let actual: string = undefined;
      revert(() => actual = formatter.formatNotRun(<TestRunLeaf<TestReportSkippedLeaf>> {result: {reason: "foo"}}, "#"));

      // assert
      expect(actual).to.match(/^::/);
    });

    it("should return the reason suffixed with a new line", () => {
      // arrange
      let revert = RewiredFormatter.__with__({os: {EOL: "::"}});
      // act
      let actual: string = undefined;
      revert(() => actual = formatter.formatNotRun(<TestRunLeaf<TestReportSkippedLeaf>> {result: {reason: "foo"}}, "#"));

      // assert
      expect(actual).to.match(/::$/);
    });
  });

  describe("formatFailure", () => {
    let revertChalk: () => void;
    let mockYellow: SinonStub;

    beforeEach(() => {
      mockYellow = Sinon.stub();
      mockYellow.callsFake(x => x);
      revertChalk = RewiredFormatter.__set__({Chalk: {yellow: mockYellow}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should style the whole message as yellow when there are no '│'", () => {
      // act
      formatter.formatFailure("foo\n bar\n baz\n", 123);

      // assert
      expect(mockYellow).to.have.been.calledWith("foo\n bar\n baz\n");
    });

    it("should not style the message as yellow when there an unexpected number of lines", () => {
      // act
      formatter.formatFailure("foo\n│ bar\n", 123);

      // assert
      expect(mockYellow).not.to.have.been.called;
    });

    it("should return the message unaltered when there an unexpected number of lines", () => {
      // arrange
      let expected = "foo\n│ bar\n";

      // act
      let actual = formatter.formatFailure(expected, 123);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should style the failure message as yellow when there are '│'", () => {
      // act
      formatter.formatFailure("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(mockYellow).to.have.been.calledWith("bar");
    });

    it("should not replace failure markers when '│ ' is missing", () => {
      // act
      let actual = formatter.formatFailure("foo\n╷\n│bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("foo\n╷\n│bar\n╵\nbaz");
    });

    it("should replace failure markers '╷', │' and '╵' with '┌','│' and'└' ", () => {
      // act
      let actual = formatter.formatFailure("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("┌ foo\n│\n│ bar\n│\n└ baz");
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equal'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalDicts'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalDicts'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalDicts bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalLists'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalLists'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalLists bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalSets'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalSets'", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalSets bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with message as lines", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with supplied maxLength", () => {
      // arrange
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailure("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(Sinon.match.any, 123);
    });
  });

  describe("formatExpectEqualFailure", () => {
    let revertChalk: () => void;

    beforeEach(() => {
      revertChalk = RewiredFormatter.__set__({Chalk: {red: x => x}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should return lines with left diff hint from compare.diff added", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], 123);

      // assert
      expect(actual).to.include("│ ^^^");
    });

    it("should return lines with right diff hint from compare.diff added", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], 123);

      // assert
      expect(actual).to.include("  ^^^");
    });

    it("should return lines without splitting when length is under maxLength", () => {
      // arrange
      (<SinonStub> mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ foo", "│", "│ bar", "│", "└ baz"], 6);

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
      let actual = formatter.formatExpectEqualFailure(["┌ fooabc", "│", "│ bar", "│", "└ baz"], 6);

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
      revertChalk = RewiredFormatter.__set__({Chalk: {red: mockRed}});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should highlight diff with red style", () => {
      // act
      formatter.chunkLine("foo", " ^^^", 10, "x", "y");

      // assert
      expect(mockRed).to.have.been.calledWith("^^^");
    });
  });

  describe("formatMessage", () => {
    it("should return empty string when message is undefined", () => {
      // act
      let actual = formatter.formatMessage(undefined, "?");

      // assert
      expect(actual).to.equal("");
    });

    it("should return string with specified padding value added on each line", () => {
      // act
      let actual = formatter.formatMessage("foo\nbar", "??");

      // assert
      expect(actual).to.equal("??foo\n??bar");
    });
  });
});
