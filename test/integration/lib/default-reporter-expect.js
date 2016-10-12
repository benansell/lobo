'use strict';

var _ = require('lodash');
var expect = require('chai').expect;

function summaryArgument(result, argName, argValue) {
  expect(result.stdout).to.match(new RegExp(argName + ':\\s+' + argValue));
}

function summaryCounts(result, pass, fail, skip, ignore) {
  expect(result.stdout).to.match(new RegExp('Passed:\\s+' + pass + '\n'));
  expect(result.stdout).to.match(new RegExp('Failed:\\s+' + fail + '\n'));
  expect(result.stdout).to.match(new RegExp('Skipped:\\s+' + skip + '\n'));

  if (ignore) {
    expect(result.stdout).to.match(new RegExp('Ignored:\\s+' + ignore + '\n'));
  }
}

function summaryFailed(result) {
  expect(result.stdout).to.match(/TEST RUN FAILED/);
}

function summaryFocused(result) {
  expect(result.stdout).to.match(/FOCUSED TEST RUN/);
}

function summaryInconclusive(result) {
  expect(result.stdout).to.match(/TEST RUN INCONCLUSIVE/);
}

function summaryPassed(result) {
  expect(result.stdout).to.match(/TEST RUN PASSED/);
}

module.exports = function(result) {
  return {
    summaryArgument: _.wrap(result, summaryArgument),
    summaryFailed: _.wrap(result, summaryFailed),
    summaryFocused: _.wrap(result, summaryFocused),
    summaryCounts: _.wrap(result, summaryCounts),
    summaryInconclusive: _.wrap(result, summaryInconclusive),
    summaryPassed: _.wrap(result, summaryPassed)
  };
};

