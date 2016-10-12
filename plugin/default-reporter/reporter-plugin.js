'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var program = require('commander');
var util = require('../../lib/util');

var passedStyle = chalk.green;
var failedStyle = chalk.red;
var skippedStyle = chalk.yellow;
var ignoredStyle = program.failOnFocus ? failedStyle : skippedStyle;
var headerStyle = chalk.bold;
var initArgs;

function runArgs(args) {
  initArgs = args;
}

function init(testCount) {
  // ignore
}

function update(result) {
  if (program.quiet) {
    return;
  }

  if (result === 'PASSED') {
    process.stdout.write('.');
  } else if (result === 'FAILED') {
    process.stdout.write(chalk.red('!'));
  } else if (result === 'SKIPPED') {
    process.stdout.write(chalk.yellow('?'));
  } else {
    process.stdout.write(' ');
  }
}

function finish(results) {
  var summary = summarizeResults(results);

  if (program.quiet) {
    paddedLog('');
    logSummaryHeader(summary);
    paddedLog('');
    return;
  }

  paddedLog('');
  logSummary(summary);
  paddedLog('');
  logFailures(summary);
  paddedLog('');

  if (program.showSkipped) {
    logSkipped(summary);
  }

  if (!program.failOnFocus) {
    return summary.failedCount === 0;
  }

  return summary.failedCount + summary.ignoredCount === 0;
}

function logSummary(summary) {
  console.log('');
  console.log('==================================== Summary ===================================');

  logSummaryHeader(summary);

  paddedLog(passedStyle('Passed:   ' + summary.passedCount));
  paddedLog(failedStyle('Failed:   ' + summary.failedCount));
  paddedLog(skippedStyle('Skipped:  ' + summary.skippedCount));

  if (summary.ignoredCount > 0) {
    paddedLog(ignoredStyle('Ignored:  ' + summary.ignoredCount));
  }

  if (summary.startDateTime && summary.endDateTime) {
    var duration = new Date(summary.endDateTime - summary.startDateTime);
    paddedLog('Duration: ' + duration.getMilliseconds() + 'ms');
  }

  paddedLog('');
  paddedLog(headerStyle('TEST RUN ARGUMENTS'));

  _.forOwn(initArgs, function(value, key) {
    paddedLog(util.padRight(key + ': ', 12) + value);
  });

  console.log('================================================================================');
}

function logSummaryHeader(summary) {
  var focused = summary.ignoredCount > 0 ? 'FOCUSED ' : '';

  if (summary.failedCount > 0) {
    paddedLog(headerStyle(failedStyle(focused + 'TEST RUN FAILED')));
  } else if (summary.skippedCount > 0) {
    paddedLog(headerStyle(skippedStyle(focused + 'TEST RUN INCONCLUSIVE')));
  } else if (program.failOnFocus) {
    paddedLog(headerStyle(failedStyle(focused + 'TEST RUN FAILED')));
  } else {
    paddedLog(headerStyle(passedStyle(focused + 'TEST RUN PASSED')));
  }
}

function logSkipped(summary) {
  var padding = '    ';
  var index = 1;

  _.forEach(summary.skipped, function(item) {
    paddedLog(index + ') ' + chalk.yellow(item.result.label));
    item.labels.pop();

    if (item.labels.length > 0) {
      paddedLog(chalk.dim('  in ' + item.labels.join(' → ')));
    }

    paddedLog('');
    console.log(formatMessage('  ' + item.result.reason, padding));
    paddedLog('');
    index++;
  });
}

function logFailures(summary) {
  var padding = '    ';
  var index = 1;

  _.forEach(summary.failures, function(item) {
    paddedLog(index + ') ' + chalk.red(item.result.label));
    item.labels.pop();

    if (item.labels.length > 0) {
      paddedLog(chalk.dim('  in ' + item.labels.join(' → ')));
    }

    _.forEach(item.result.resultMessages, function(resultMessage) {
      if (resultMessage.given && resultMessage.given.length > 0) {
        paddedLog('');
        paddedLog('  • ' + chalk.yellow('Given'));
        console.log(formatMessage('  ' + resultMessage.given, padding));
      }

      paddedLog('');
      var message = formatFailure(resultMessage.message);
      console.log(formatMessage(message, padding));
      paddedLog('');
    });
    index++;
  });
}

function formatFailure(message) {
  if (message.indexOf('│') === -1) {
    return message.replace(message, '\n  ' + chalk.yellow(message) + '\n');
  }

  var lines = message.split('\n');

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

  if (lines[2].indexOf('│ ' + chalk.yellow('Expect.equal')) !== -1) {
    lines = formatExpectEqualFailure(lines);
  }

  return lines.join('\n');
}

function formatExpectEqualFailure(lines) {
  if (lines[0].startsWith('┌ "') && lines[4].startsWith('└ "')) {
    return formatExpectEqualStringFailure(lines);
  }

  return lines;
}

function formatExpectEqualStringFailure(lines) {
  // don't add hint on long lines
  if (lines[0].length > 80 || lines[4].length > 80) {
    return lines;
  }

  if (lines[0].length > lines[4].length) {
    lines[1] = formatExpectDiffLength(lines[4], lines[0], lines[1] + ' ');
  } else {
    lines.push(formatExpectDiffLength(lines[0], lines[4], '  '));
  }

  return lines;
}

function formatExpectDiffLength(short, long, existing) {
  var limit = short.length - 1;
  var suffix = '';

  for (var i = 2; i < long.length - 1; i++) {
    var char = long[i];

    if (i < limit) {
      suffix += short[i] === char ? ' ' : '^';
    } else {
      suffix += '^';
    }
  }

  return existing + chalk.red(suffix);
}

function formatMessage(rawMessage, padding) {
  if (!rawMessage) {
    return '';
  }

  return padding + rawMessage.replace(/(\n)+/g, '\n' + padding);
}

function summarizeResults(results) {
  var summary = {
    passedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    ignoredCount: 0,
    failures: [],
    skipped: []
  };

  var minResult = _.minBy(results, function(r) {
    return r.startTime;
  });

  if (minResult) {
    summary.startDateTime = new Date(minResult.startTime);
  }

  var maxResult = _.maxBy(results, function(r) {
    return r.endTime;
  });

  if (maxResult) {
    summary.endDateTime = new Date(maxResult.endTime);
  }

  processResults(results, summary, []);

  return summary;
}

function processResults(results, summary, labels) {
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
        summary.ignoredCount += 1;
        break;
      case 'PASSED':
        summary.passedCount += 1;
        break;
      case 'SKIPPED':
        summary.skippedCount += 1;
        summary.skipped.push({labels: _.clone(labels), result: r});
        break;
      default:
        labels.push(r.label);
        processResults(r.results, summary, labels);
    }
  });
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
