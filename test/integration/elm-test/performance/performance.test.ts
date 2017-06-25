'use strict';

var expect = require('chai').expect;
var runner = require('../../lib/test-runner');
var reporterExpect = require('../../lib/default-reporter-expect');
var util = require('../../lib/util');

describe('elm-test-performance', function() {
  var testContext;

  before(function() {
    testContext = util.initializeTestContext(__dirname);
    util.cd(__dirname);
  });

  describe('1000', function() {
    beforeEach(function() {
      runner.contextPush(testContext, '1000');
      runner.clean();
    });

    afterEach(function() {
      runner.contextPop(testContext);
    });

    it('should report success', function() {
      // act
      var result = runner.run(testContext, 'elm-test');

      // assert
      reporterExpect(result).summaryPassed();
      reporterExpect(result).summaryCounts(1000, 0);
      expect(result.code).to.equal(0);
    });
  });
});
