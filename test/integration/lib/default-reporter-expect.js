'use strict';

var _ = require('lodash');
var expect = require('chai').expect;

function summaryArgument(result, argName, argValue) {
  expect(result.stdout).to.match(new RegExp(argName + ':\\s+' + argValue));
}

function summaryCounts(result, pass, fail, todo, skip, ignore) {
  expect(result.stdout).to.match(new RegExp('Passed:\\s+' + pass + '\n'));
  expect(result.stdout).to.match(new RegExp('Failed:\\s+' + fail + '\n'));

  if(todo || todo === 0) {
    expect(result.stdout).to.match(new RegExp('Todo:\\s+' + todo + '\n'));
  } else {
    expect(result.stdout).not.to.match(new RegExp('Todo:\\s+'));
  }

  if(skip || skip === 0) {
    expect(result.stdout).to.match(new RegExp('Skipped:\\s+' + skip + '\n'));
  } else {
    expect(result.stdout).not.to.match(new RegExp('Skipped:\\s+'));
  }

  if (ignore || ignore === 0) {
    expect(result.stdout).to.match(new RegExp('Ignored:\\s+' + ignore + '\n'));
  } else {
    expect(result.stdout).not.to.match(new RegExp('Ignored:\\s+'));
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

function summaryPartial(result) {
  expect(result.stdout).to.match(/PARTIAL TEST RUN/);
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
    summaryPartial: _.wrap(result, summaryPartial),
    summaryPassed: _.wrap(result, summaryPassed)
  };
};

