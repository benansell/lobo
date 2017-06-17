'use strict';

const _ = require('lodash');
var program = require('commander');

var reporterPlugin;

function configure(plugin) {
  reporterPlugin = plugin;
}

function runArgs(args) {
  reporterPlugin.runArgs(args);
}

function init(testCount) {
  reporterPlugin.init(testCount);
}

function update(result) {
  if (program.quiet) {
    return;
  }

  reporterPlugin.update(result);
}

function finish(rawResults) {
  var results = processResults(rawResults);
  reporterPlugin.finish(results);

  return results.summary.success;
}

function processResults(rawResults) {
  var summary = {
    config: rawResults.config,
    success: false,
    outcome: undefined,
    startDateTime: undefined,
    endDateTime: undefined,
    durationMilliseconds: undefined,
    passedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    onlyCount: 0,
    todoCount: 0,
    runType: rawResults.runType,
    runResults: rawResults.runResults,
    failures: [],
    skipped: [],
    todo: []
  };

  if (rawResults.startTime) {
    summary.startDateTime = new Date(rawResults.startTime);
  }

  if (rawResults.endTime) {
    summary.endDateTime = new Date(rawResults.endTime);
  }

  if (summary.startDateTime && summary.endDateTime) {
    var durationDate = new Date(summary.endDateTime - summary.startDateTime);
    summary.durationMilliseconds = durationDate.getMilliseconds();
  }

  processTestResults(rawResults.runResults, summary, []);

  var failState = {
    only: toFailState(program.failOnOnly, summary.onlyCount > 0 || summary.runType === 'FOCUS'),
    skip: toFailState(program.failOnSkip, summary.skippedCount > 0 || summary.runType === 'SKIP'),
    todo: toFailState(program.failOnTodo, summary.todoCount > 0)
  };

  if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
    summary.success = false;
  } else {
    summary.success = summary.failedCount === 0;
  }

  summary.outcome = calculateOutcome(summary, failState);

  return {summary: summary, failState: failState};
}

function processTestResults(results, summary, labels) {
  if (!results) {
    return;
  }

  _.forEach(results, function(r) {
    switch (r.resultType) {
      case 'FAILED':
        summary.failedCount += 1;
        summary.failures.push({labels: _.clone(labels), result: r});
        break;
      case 'IGNORED':
        summary.onlyCount += 1;
        break;
      case 'PASSED':
        summary.passedCount += 1;
        break;
      case 'SKIPPED':
        summary.skippedCount += 1;
        summary.skipped.push({labels: _.clone(labels), result: r});
        break;
      case 'TODO':
        summary.todoCount += 1;
        summary.todo.push({labels: _.clone(labels), result: r});
        break;
      default:
        var newLabels = _.clone(labels);
        newLabels.push(r.label);
        processTestResults(r.results, summary, newLabels);
    }
  });
}

function toFailState(flag, exists) {
  var state = {
    isFailOn: flag === true,
    exists: exists,
    isFailure: flag && exists
  };

  return state;
}

function calculateOutcome(summary, failState) {
  var prefix;

  if(summary.runType !== 'NORMAL') {
    prefix = 'PARTIAL ';
  } else {
    prefix = summary.onlyCount > 0 ? 'FOCUSED ' : '';
  }

  if (summary.failedCount > 0) {
    return prefix + 'TEST RUN FAILED';
  } else if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
    return prefix + 'TEST RUN FAILED';
  } else if (failState.skip.exists || failState.todo.exists) {
    return prefix + 'TEST RUN INCONCLUSIVE';
  } else {
    return prefix + 'TEST RUN PASSED';
  }
}

module.exports = {
  configure: configure,
  finish: finish,
  init: init,
  runArgs: runArgs,
  update: update
};

