'use strict';

const _ = require('lodash');
const chalk = require('chalk');
var program = require('commander');
var compare = require('./compare');
var util = require('../../lib/util');

var passedStyle = chalk.green;
var failedStyle = chalk.red;
var givenStyle = chalk.yellow;
var inconclusiveStyle = chalk.yellow;
var headerStyle = chalk.bold;
var labelStyle = chalk.dim;
var onlyStyle = undefined;
var skipStyle = undefined;
var todoStyle = undefined;
var initArgs;

function runArgs(args) {
  initArgs = args;
}

function init(testCount) {
  // ignore testCount

  onlyStyle = program.failOnOnly ? failedStyle : inconclusiveStyle;
  skipStyle = program.failOnSkip ? failedStyle : inconclusiveStyle;
  todoStyle = program.failOnTodo ? failedStyle : inconclusiveStyle;
}

function update(result) {
  if(!result) {
    process.stdout.write(' ');
  } else if (result.resultType === 'PASSED') {
    process.stdout.write('.');
  } else if (result.resultType === 'FAILED') {
    process.stdout.write(chalk.red('!'));
  } else if (result.resultType === 'SKIPPED') {
    process.stdout.write(skipStyle('?'));
  } else if (result.resultType === 'TODO') {
    process.stdout.write(todoStyle('-'));
  } else {
    process.stdout.write(' ');
  }
}

function finish(results) {
  var summary = results.summary;
  var failState = results.failState;

  if (program.quiet) {
    paddedLog('');
    logSummaryHeader(summary, failState);
    paddedLog('');
    return;
  }

  paddedLog('');
  logSummary(summary, failState);
  paddedLog('');
  logNonPassed(summary);
  paddedLog('');
}

function logSummary(summary, failState) {
  console.log('');
  console.log('==================================== Summary ===================================');

  logSummaryHeader(summary, failState);

  paddedLog(passedStyle('Passed:   ' + summary.passedCount));
  paddedLog(failedStyle('Failed:   ' + summary.failedCount));

  if(summary.todoCount > 0) {
    paddedLog(todoStyle('Todo:  ' + summary.todoCount));
  }

  if(program.framework !== 'elm-test') {
    // full run details not available when using elm-test

    if(summary.skippedCount > 0) {
      paddedLog(skipStyle('Skipped:  ' + summary.skippedCount));
    }

    if (summary.onlyCount > 0) {
      paddedLog(onlyStyle('Ignored:  ' + summary.onlyCount));
    }
  }

  if (summary.durationMilliseconds) {
    paddedLog('Duration: ' + summary.durationMilliseconds + 'ms');
  }

  paddedLog('');
  paddedLog(headerStyle('TEST RUN ARGUMENTS'));

  _.forOwn(initArgs, function(value, key) {
    paddedLog(util.padRight(key + ': ', 12) + value);
  });

  console.log('================================================================================');
}

function logSummaryHeader(summary, failState) {
  var outcomeStyle = passedStyle;

  if (summary.failedCount > 0) {
    outcomeStyle = failedStyle;
  } else if (failState.only.isFailure || failState.skip.isFailure || failState.todo.isFailure) {
    outcomeStyle = failedStyle;
  } else if (failState.skip.exists || failState.todo.exists) {
    outcomeStyle = inconclusiveStyle;
  }

  paddedLog(headerStyle(outcomeStyle(summary.outcome)));
}

function sortItemsByLabel(item) {
  if (item.length === 0) {
    return item;
  }

  var failureSortKey = function(x) {
    return x.labels.join(' ') + ' ' + x.result.label;
  };

  var maxItem = _.maxBy(item, function(x) {
    return failureSortKey(x).length;
  });

  var max = failureSortKey(maxItem).length;

  return _.sortBy(item, [function(x) {
    return _.padStart(failureSortKey(x), max, ' ');
  }]).reverse();
}

function logNonPassed(summary) {
  var itemList = _.clone(summary.failures);

  if (program.showSkip) {
    itemList = itemList.concat(summary.skipped);
  }

  if (program.showTodo) {
    itemList = itemList.concat(summary.todo);
  }

  var sortedItemList = sortItemsByLabel(itemList);
  var padding = '    ';
  var context = [];
  var index = 1;

  while (sortedItemList.length > 0) {
    var item = sortedItemList.pop();
    var isNotRun = false;
    var style = failedStyle;

    if(item.result.resultType === 'SKIPPED') {
      isNotRun = true;
      style = skipStyle;
    } else if(item.result.resultType === 'TODO') {
      isNotRun = true;
      style = todoStyle;
    }

    context = logLabels(item.labels, item.result.label, index, context, style);

    if (isNotRun) {
      logNotRunMessage(item, padding);
    } else {
      logFailureMessage(item, padding);
    }
    index++;
  }
}

function logLabels(labels, itemLabel, index, context, itemStyle) {
  if (labels.length === 0) {
    return;
  }

  var labelPad = '';
  var i;

  for (i = 0; i < labels.length; i++) {
    if (context[i] !== labels[i]) {
      context = context.slice(0, i);
      break;
    }
  }

  for (var j = 0; j < labels.length; j++) {
    if (context[j] === labels[j]) {
      labelPad += ' ';
      continue;
    }

    var label = labels[j];
    paddedLog(labelStyle(labelPad + label));
    labelPad += ' ';
    context.push(label);
  }

  paddedLog('    ' + index + ') ' + itemStyle(itemLabel));

  return context;
}

function logFailureMessage(item, padding) {
  var maxLength = process.stdout.columns ? process.stdout.columns - padding.length : 80;

  _.forEach(item.result.resultMessages, function(resultMessage) {
    if (resultMessage.given && resultMessage.given.length > 0) {
      paddedLog('');
      paddedLog('  • ' + givenStyle('Given'));
      console.log(formatMessage('  ' + resultMessage.given, padding));
    }

    paddedLog('');
    // default to a width of 80 when process is not running in a terminal

    var message = formatFailure(resultMessage.message, maxLength);
    console.log(formatMessage(message, padding));
    paddedLog('');
  });
}

function logNotRunMessage(item, padding) {
  paddedLog('');
  paddedLog(formatMessage(item.result.reason, padding));
  paddedLog('');
}

function formatFailure(message, maxLength) {
  if (message.indexOf('│') === -1) {
    return message.replace(message, '\n  ' + chalk.yellow(message) + '\n');
  }

  var lines = message.split('\n');

  // remove diff lines
  var diffRegex = /Expect.equal(Dicts|Lists|Sets)/;

  if (lines.length > 5 && diffRegex.test(lines[2])) {
    lines.splice(5, lines.length - 5);
  }

  if (lines.length !== 5) {
    return message;
  }

  if (lines[2].indexOf('│ ') !== -1) {
    lines[0] = '┌ ' + lines[0];
    lines[1] = lines[1].replace('╷', '│');
    lines[3] = lines[3].replace('╵', '│');
    lines[4] = '└ ' + lines[4];

    var expectMessage = lines[2].substring(2, lines[2].length);
    lines[2] = lines[2].replace(expectMessage, chalk.yellow(expectMessage));
  }

  var expectEqualRegex = /Expect.equal(Dicts|Lists|Sets)*/;

  if (expectEqualRegex.test(lines[2])) {
    lines = formatExpectEqualFailure(lines, maxLength);
  }

  return lines.join('\n');
}

function formatExpectEqualFailure(unprocessedLines, maxLength) {
  var lines = _.clone(unprocessedLines);
  lines.push('   ');

  // remove "┌ " and "└ "
  var left = lines[0].substring(2);
  var right = lines[4].substring(2);
  var value = compare.diff(left, right);
  lines[1] = '│ ' + value.left;
  lines[5] = '  ' + value.right;

  lines[0] = chunkLine(lines[0], lines[1], maxLength, '┌ ', '│ ');
  lines[1] = '';

  lines[4] = chunkLine(lines[4], lines[5], maxLength, '└ ', '  ');
  lines[5] = '';

  lines = _.flattenDepth(lines, 1);

  return lines;
}

function chunkLine(rawContentLine, rawDiffLine, length, firstPrefix, prefix) {
  var contentLine = rawContentLine.substring(firstPrefix.length - 1);
  var diffLine = rawDiffLine.substring(firstPrefix.length - 1);
  var size = Math.ceil(contentLine.length / length);
  var chunks = new Array(size * 2);
  var offset;
  var sectionLength = length - prefix.length - 1;

  chunks[0] = firstPrefix + contentLine.substring(1, sectionLength + 1);
  chunks[1] = prefix + chalk.red(diffLine.substring(1, sectionLength + 1));

  for (var i = 1; i < size; i++) {
    offset = (i * sectionLength) + 1;
    chunks[i * 2] = prefix + contentLine.substring(offset, offset + sectionLength);
    chunks[i * 2 + 1] = prefix + chalk.red(diffLine.substring(offset, offset + sectionLength));
  }

  return chunks;
}

function formatMessage(rawMessage, padding) {
  if (!rawMessage) {
    return '';
  }

  return padding + rawMessage.replace(/(\n)+/g, '\n' + padding);
}

function paddedLog(message) {
  if (!message) {
    console.log('');
    return;
  }

  console.log('  ' + message);
}

module.exports = {
  runArgs: runArgs,
  init: init,
  update: update,
  finish: finish
};
