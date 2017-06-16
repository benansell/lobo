'use strict';

var program = require('commander');

function runArgs(args) {
  // ignore args
}

function init(testCount) {
  // ignore testCount
}

function update(result) {
  console.log(JSON.stringify(result));
}

function finish(results) {
  if (program.quiet) {
    logSummary(results.summary);
  } else {
    logFull(results.summary);
  }
}

function logSummary(summary) {
  var output = {
    config: summary.config,
    success: summary.success,
    outcome: summary.outcome,
    startDateTime: summary.startDateTime,
    endDateTime: summary.endDateTime,
    durationMilliseconds: summary.durationMilliseconds,
    passedCount: summary.passedCount,
    failedCount: summary.failedCount,
    skippedCount: summary.skippedCount,
    onlyCount: summary.onlyCount,
    todoCount: summary.todoCount,
    runType: summary.runType
  };

  console.log(JSON.stringify(output));
}

function logFull(summary) {
  console.log(JSON.stringify(summary));
}

module.exports = {
  runArgs: runArgs,
  init: init,
  update: update,
  finish: finish
};
