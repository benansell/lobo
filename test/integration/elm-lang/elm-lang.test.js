'use strict';

var expect = require('chai').expect;
var runner = require('../lib/test-runner');
var reporterExpect = require('../lib/default-reporter-expect');
var util = require('../lib/util');

describe('elm-lang', function() {
  var testContext;

  before(function() {
    util.cd(process.env.PWD);

    testContext = [];
    runner.contextPush(testContext, 'test');
    runner.contextPush(testContext, 'integration');
    runner.contextPush(testContext, 'elm-lang');
  });

  describe('import-check', function() {
    beforeEach(function() {
      runner.clean();
    });

    it('should build and report success test run', function() {
      // act
      var result = runner.run(testContext, 'elm-test');

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1, 0, 0);
      expect(result.code).to.equal(0);
    });
  });
});
