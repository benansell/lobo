"use strict";

import * as chai from "chai";
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import rewire = require("rewire");
import * as SinonChai from "sinon-chai";
import {createTestResultFormatter, TestResultFormatter, TestResultFormatterImp} from "../../../lib/test-result-formatter";
import {Comparer} from "../../../lib/comparer";
import {
  FailureMessage, ProgressReport, ResultType, TestReportFailedLeaf, TestReportSkippedLeaf, TestResultDecorator,
} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(SinonChai);

describe("lib test-result-formatter", () => {
  let RewiredFormatter = rewire("../../../lib/test-result-formatter");
  let formatter: TestResultFormatterImp;
  let mockComparer: Comparer;
  let mockDecorator: TestResultDecorator;
  let mockLogger: { log(message: string): void };

  beforeEach(() => {
    RewiredFormatter.__set__({os: {EOL: "\n"}});
    let rewiredImp = RewiredFormatter.__get__("TestResultFormatterImp");
    mockComparer = <Comparer> {diff: Sinon.stub()};
    mockDecorator = <TestResultDecorator><{}>{
      bulletPoint: Sinon.stub(),
      diff: Sinon.stub(),
      expect: Sinon.stub(),
      failed: Sinon.stub(),
      line: Sinon.stub(),
      given: Sinon.stub(),
      skip: Sinon.stub(),
      todo: Sinon.stub(),
      verticalBarEnd: Sinon.stub(),
      verticalBarMiddle: Sinon.stub(),
      verticalBarStart: Sinon.stub()
    };
    mockLogger = {log: Sinon.spy()};
    formatter = new rewiredImp(mockComparer, mockDecorator);
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
    it("should call formatFailure for supplied failure message", () => {
      // arrange
      let expected = <FailureMessage>{message: ""};
      formatter.formatFailureMessage = Sinon.spy();

      // act
      formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(formatter.formatFailureMessage).to.have.been.calledWith(expected.message, Sinon.match.any);
    });

    it("should call formatFailure with supplied columns value", () => {
      // arrange
      let revert = RewiredFormatter.__with__({process: {stdout: undefined}});
      let expected = <FailureMessage>{message: ""};
      formatter.formatFailureMessage = Sinon.spy();

      // act
      revert(() => formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123));

      // assert
      expect(formatter.formatFailureMessage).to.have.been.calledWith(Sinon.match.any, 123);
    });

    it("should return the formatted failure message from the supplied failure", () => {
      // arrange
      let expected = <FailureMessage>{message: "foo"};
      formatter.formatFailureMessage = x => x;
      formatter.formatMessage = (message, padding) => message;

      // act
      let actual = formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(actual).to.match(/foo/);
    });

    it("should return the failure given from the supplied failure with padding of 2", () => {
      // arrange
      (<SinonStub>mockDecorator.line).callsFake(x => x);
      let expected = <FailureMessage>{given: "foo", message: ""};
      formatter.formatMessage = (x, y) => x;

      // act
      let actual = formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(actual).to.match(/ {2}foo/);
    });

    it("should return the failure with bullet points replaced with decorator value", () => {
      // arrange
      (<SinonStub>mockDecorator.given).callsFake(x => x);
      (<SinonStub>mockDecorator.line).callsFake(x => x);
      (<SinonStub>mockDecorator.bulletPoint).callsFake(() => "::");
      let expected = <FailureMessage>{given: "foo", message: ""};
      formatter.formatMessage = (x, y) => x;

      // act
      let actual = formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(actual).not.to.match(/•/);
      expect(actual).to.match(/:: Given/);
    });

    it("should return the failure with vertical bar end replaced with decorator value", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      (<SinonStub>mockDecorator.verticalBarEnd).callsFake(() => "::");
      let expected = <FailureMessage>{message: "└foo└"};
      formatter.formatMessage = (x, y) => x;

      // act
      let actual = formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(actual).not.to.match(/└/);
      expect(actual).to.match(/::foo::/);
    });

    it("should return the failure with vertical bar middle replaced with decorator value", () => {
      // arrange
      (<SinonStub>mockDecorator.verticalBarMiddle).callsFake(() => "::");
      let expected = <FailureMessage>{message: "│foo│"};
      formatter.formatMessage = (x, y) => x;

      // act
      let actual = formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(actual).not.to.match(/│/);
      expect(actual).to.match(/::foo::/);
    });

    it("should return the failure with vertical bar start replaced with decorator value", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      (<SinonStub>mockDecorator.verticalBarStart).callsFake(() => "::");
      let expected = <FailureMessage>{message: "┌foo┌"};
      formatter.formatMessage = (x, y) => x;

      // act
      let actual = formatter.formatFailure(<TestReportFailedLeaf> {resultMessages: [expected]}, "?", 123);

      // assert
      expect(actual).not.to.match(/┌/);
      expect(actual).to.match(/::foo::/);
    });
  });

  describe("formatNotRun", () => {
    it("should return the reason padded by the supplied value and 2 spaces", () => {
      // act
      let actual = formatter.formatNotRun(<TestReportSkippedLeaf> {reason: "foo"}, "#");

      // assert
      expect(actual).to.match(/ {2}#foo/);
    });

    it("should return the reason prefixed with a new line", () => {
      // arrange
      let revert = RewiredFormatter.__with__({os: {EOL: "::"}});
      // act
      let actual: string = undefined;
      revert(() => actual = formatter.formatNotRun(<TestReportSkippedLeaf> {reason: "foo"}, "#"));

      // assert
      expect(actual).to.match(/^::/);
    });

    it("should return the reason suffixed with a new line", () => {
      // arrange
      let revert = RewiredFormatter.__with__({os: {EOL: "::"}});
      // act
      let actual: string = undefined;
      revert(() => actual = formatter.formatNotRun(<TestReportSkippedLeaf> {reason: "foo"}, "#"));

      // assert
      expect(actual).to.match(/::$/);
    });
  });

  describe("formatFailureMessage", () => {
    it("should style the whole message with expect styling when there are no '│'", () => {
      // act
      formatter.formatFailureMessage("foo\n bar\n baz\n", 123);

      // assert
      expect(mockDecorator.expect).to.have.been.calledWith("foo\n bar\n baz\n");
    });

    it("should not style the message with expect styling when there an unexpected number of lines", () => {
      // act
      formatter.formatFailureMessage("foo\n│ bar\n", 123);

      // assert
      expect(mockDecorator.expect).not.to.have.been.called;
    });

    it("should return the message unaltered when there an unexpected number of lines", () => {
      // arrange
      let expected = "foo\n│ bar\n";

      // act
      let actual = formatter.formatFailureMessage(expected, 123);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should style the failure message using expect styling when there are '│'", () => {
      // act
      formatter.formatFailureMessage("foo\n╷\n│ bar\n╵\nbaz", 123);

      // assert
      expect(mockDecorator.expect).to.have.been.calledWith("bar");
    });

    it("should not replace failure markers when '│ ' is missing", () => {
      // arrange
      (<SinonStub>mockDecorator.line).callsFake(x => x);

      // act
      let actual = formatter.formatFailureMessage("foo\n╷\n│bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("\nfoo\n╷\n│bar\n╵\nbaz\n");
    });

    it("should replace failure marker '╷' with '│'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      (<SinonStub>mockDecorator.line).callsFake(x => x);

      // act
      let actual = formatter.formatFailureMessage("foo\n╷\n│ bar\n╷\nbaz", 123);

      // assert
      expect(actual).to.equal("\n┌ foo\n│\n│ bar\n│\n└ baz\n");
    });

    it("should replace failure marker '╵' with '│'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      (<SinonStub>mockDecorator.line).callsFake(x => x);

      // act
      let actual = formatter.formatFailureMessage("foo\n╵\n│ bar\n╵\nbaz", 123);

      // assert
      expect(actual).to.equal("\n┌ foo\n│\n│ bar\n│\n└ baz\n");
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equal'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalDicts'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalDicts'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equalDicts bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalDicts bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalLists'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalLists'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equalLists bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalLists bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure when failure message contains 'Expect.equalSets'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.called;
    });

    it("should remove elm-test diff lines when failure message contains them for 'Expect.equalSets'", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equalSets bar\n╵\nbaz\n Diff: qux\n quux", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equalSets bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with message as lines", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], Sinon.match.any);
    });

    it("should call formatExpectEqualFailure for equals failure with supplied maxLength", () => {
      // arrange
      (<SinonStub>mockDecorator.expect).callsFake(x => x);
      formatter.formatExpectEqualFailure = Sinon.stub();
      (<SinonStub>formatter.formatExpectEqualFailure).returns([]);

      // act
      formatter.formatFailureMessage("foo\n╷\n│ Expect.equal bar\n╵\nbaz", 123);

      // assert
      expect(formatter.formatExpectEqualFailure).to.have.been.calledWith(Sinon.match.any, 123);
    });
  });

  describe("formatExpectEqualFailure", () => {
    it("should return lines with left diff hint from compare.diff added", () => {
      // arrange
      (<SinonStub>mockDecorator.diff).callsFake(x => x);
      (<SinonStub>mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], 123);

      // assert
      expect(actual).to.include("│ ^^^");
    });

    it("should return lines with right diff hint from compare.diff added", () => {
      // arrange
      (<SinonStub>mockDecorator.diff).callsFake(x => x);
      (<SinonStub>mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ foo", "│", "│ Expect.equal bar", "│", "└ baz"], 123);

      // assert
      expect(actual).to.include("  ^^^");
    });

    it("should return lines without splitting when length is under maxLength", () => {
      // arrange
      (<SinonStub>mockDecorator.diff).callsFake(x => x);
      (<SinonStub>mockComparer.diff).returns({left: "^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ foo", "│", "│ bar", "│", "└ baz"], 6);

      // assert
      expect(actual.length).to.equal(6);
      expect(actual[0]).to.equal("┌ foo");
      expect(actual[1]).to.equal("│ ^^^");
      expect(actual[2]).to.equal("│ bar");
      expect(actual[3]).to.equal("│");
      expect(actual[4]).to.equal("└ baz");
      expect(actual[5]).to.equal("  ^^^");
    });

    it("should return split lines when length is over max length", () => {
      // arrange
      (<SinonStub>mockDecorator.diff).callsFake(x => x);
      (<SinonStub>mockComparer.diff).returns({left: "^^^^^^", right: "^^^"});

      // act
      let actual = formatter.formatExpectEqualFailure(["┌ fooabc", "│", "│ bar", "│", "└ baz"], 6);

      // assert
      expect(actual.length).to.equal(8);
      expect(actual[0]).to.equal("┌ foo");
      expect(actual[1]).to.equal("│ ^^^");
      expect(actual[2]).to.equal("│ abc");
      expect(actual[3]).to.equal("│ ^^^");
      expect(actual[4]).to.equal("│ bar");
      expect(actual[5]).to.equal("│");
      expect(actual[6]).to.equal("└ baz");
      expect(actual[7]).to.equal("  ^^^");
    });
  });

  describe("chunkLine", () => {
    it("should highlight diff with red style", () => {
      // act
      formatter.chunkLine("foo", " ^^^", 10, "x", "y");

      // assert
      expect(mockDecorator.diff).to.have.been.calledWith("^^^");
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

  describe("formatUpdate", () => {
    it("should report '.' when a test has 'PASSED'", () => {
      // act
      let output = formatter.formatUpdate(<ProgressReport>{resultType: "PASSED"});

      // assert
      expect(output).to.equal(".");
    });

    it("should report '!' with failed styling when a test has 'FAILED'", () => {
      // arrange
      (<SinonStub>mockDecorator.failed).callsFake(x => x + " foo");

      // act
      let output = formatter.formatUpdate(<ProgressReport>{resultType: "FAILED"});

      // assert
      expect(output).to.equal("! foo");
    });

    it("should report '?' with skipped styling when a test has 'SKIPPED'", () => {
      // arrange
      (<SinonStub>mockDecorator.skip).callsFake(x => x + " foo");

      // act
      let output = formatter.formatUpdate(<ProgressReport>{resultType: "SKIPPED"});

      // assert
      expect(output).to.equal("? foo");
    });

    it("should report '-' with todo styling when a test has 'TODO'", () => {
      // arrange
      (<SinonStub>mockDecorator.todo).callsFake(x => x + " foo");

      // act
      let output = formatter.formatUpdate(<ProgressReport>{resultType: "TODO"});

      // assert
      expect(output).to.equal("- foo");
    });

    it("should report ' ' when reportProgress is undefined", () => {
      // act
      let output = formatter.formatUpdate(undefined);

      // assert
      expect(output).to.equal(" ");
    });

    it("should report ' ' when a test has unknown resultType", () => {
      // act
      let output = formatter.formatUpdate(<ProgressReport>{resultType: <ResultType>"foo bar"});

      // assert
      expect(output).to.equal(" ");
    });
  });
});
