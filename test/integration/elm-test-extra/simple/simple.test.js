'use strict';

var expect = require('chai').expect;
var runner = require('../../lib/test-runner');
var reporterExpect = require('../../lib/default-reporter-expect');
var util = require('../../lib/util');

describe('elm-test-extra-simple', function() {
  var testContext;

  before(function() {
    testContext = util.initializeTestContext(__dirname);
    util.cd(__dirname);
  });

  describe('pass', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'pass');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report success', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe('fail', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'fail');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report failure', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(0, 32);
      expect(result.code).to.equal(1);
    });

    it('should update message to use ┌ └  instead of ╷ ╵', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      var startIndex = result.stdout
        .indexOf('================================================================================');
      var failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).not.to.have.string('╷');
      expect(failureMessage).not.to.have.string('╵');
      expect(failureMessage).to.have.string('┌');
      expect(failureMessage).to.have.string('└');
    });

    it('should update string equals to show diff hint', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      var startIndex = result.stdout
        .indexOf('================================================================================');
      var failureMessage = result.stdout.substring(startIndex, result.stdout.length - 1);

      expect(failureMessage).to.match(/\n\s{4}┌ "foobar"\n/g);
      expect(failureMessage).to.match(/\n\s{4}│\s{3}\^ \^\^\^\s\n/g);
      expect(failureMessage).to.match(/\n\s{4}│ Expect.equal\n/g);
      expect(failureMessage).to.match(/\n\s{4}│\n/g);
      expect(failureMessage).to.match(/\n\s{4}└ "fao"/g);

      expect(failureMessage).to.match(/\n\s{4}┌ ""\n/g);
      expect(failureMessage).to.match(/\n\s{4}│\n/g);
      expect(failureMessage).to.match(/\n\s{4}│ Expect.equal\n/g);
      expect(failureMessage).to.match(/\n\s{4}│\n/g);
      expect(failureMessage).to.match(/\n\s{4}└ " "/g);
      expect(failureMessage).to.match(/\n\s{11}\n/g);
    });
  });

  describe('fuzz', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'fuzz');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report success', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      expect(result.code).to.equal(0);
    });

    it('should use supplied run count', function() {
      // arrange
      var expectedRunCount = 11;

      // act
      var result = runner.run(testContext, 'elm-test-extra', '--runCount=' + expectedRunCount);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      reporterExpect(result).summaryArgument('runCount', expectedRunCount);

      expect(result.stdout.match(/fuzzingTest-Executed/g).length).to.equal(expectedRunCount);
      expect(result.stdout.match(/listLengthTest-Executed/g).length).to.equal(expectedRunCount);
      expect(result.stdout.match(/fuzz2Test-Executed/g).length).to.equal(expectedRunCount);

      // fuzzWithTest runs property should override the supplied value
      expect(result.stdout.match(/fuzzWithTest-Executed/g).length).to.equal(13);

      expect(result.code).to.equal(0);
    });

    it('should use supplied initial seed', function() {
      // arrange
      var initialSeed = 101;

      // act
      var result = runner.run(testContext, 'elm-test-extra', '--seed=' + initialSeed);

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(4, 0);
      reporterExpect(result).summaryArgument('seed', initialSeed);
      expect(result.code).to.equal(0);
    });
  });

  describe('nested', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'nested');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report success', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1, 0);
      expect(result.code).to.equal(0);
    });
  });

  describe('tree', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'tree');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report failure', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryFailed();
      reporterExpect(result).summaryCounts(5, 2);
      expect(result.stdout).to.matches(/Tests(.|\n)+SecondChildTest\n.+failingTest - Child/);
      expect(result.stdout).to.matches(/Tests(.|\n)+FailingGrandChildTest\n.+failingTest - GrandChild/);
      expect(result.code).to.equal(1);
    });
  });

  describe('only', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'only');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report focused passed', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra', '--runCount=5');

      // assert
      reporterExpect(result).summaryFocused();
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(3, 0, null, null, 3);
      expect(result.code).to.equal(0);
    });
  });

  describe('skip', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'skip');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report inconclusive', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, null, 5);
      expect(result.code).to.equal(0);
    });
  });

  describe('todo', function() {
    beforeEach(function() {
      runner.contextPush(testContext, 'todo');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report inconclusive', function() {
      // act
      var result = runner.run(testContext, 'elm-test-extra');

      // assert
      reporterExpect(result).summaryInconclusive();
      reporterExpect(result).summaryCounts(1, 0, 1);
      expect(result.code).to.equal(0);
    });
  });
});
