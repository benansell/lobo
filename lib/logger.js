'use strict';

var chalk = require('chalk');
var program = require('commander');

var create = function() {
  return {
    trace: trace,
    debug: debug,
    info: info,
    warn: warn,
    error: error
  };
};

function trace(message, data) {
  log('trace', message, data);
}

function debug(message, data) {
  log('debug', message, data);
}

function info(message, data) {
  log('info', message, data);
}

function warn(message, data) {
  log('warn', message, data);
}

function error(message, data) {
  log('error', message, data);
}

function log(logLevel, message, data) {
  if (!showLogMessage(logLevel)) {
    return;
  }

  var logger = levelToLogger(logLevel);
  var style = levelToStyle(logLevel);

  if (data === undefined || data === null) {
    logger(style(message));
  } else if (data instanceof Error) {
    logger(style(message + ': '), style(data));
  } else {
    logger(style(message + ': '), style(JSON.stringify(data)));
  }
}

function showLogMessage(level) {
  switch (level) {
    case 'trace':
      return isOption('veryVerbose');
    case 'debug':
      return isOption('veryVerbose') || isOption('verbose');
    case 'info':
      return isOption('veryVerbose') || isOption('verbose') ||
        !isOption('quiet');
    case 'warn':
      return isOption('veryVerbose') || isOption('verbose') ||
        !isOption('quiet');
    case 'error':
      return true;
    default:
      throw new Error('Unknown log level: ' + level);
  }
}

function isOption(name) {
  var value = program[name];

  if (!value) {
    return false;
  }

  return value;
}

function levelToLogger(level) {
  switch (level) {
    case 'trace':
      return console.log;
    case 'debug':
      return console.log;
    case 'info':
      return console.info;
    case 'warn':
      return console.warn;
    case 'error':
      return console.error;
    default:
      throw new Error('Unknown log level: ' + level);
  }
}

function levelToStyle(level) {
  switch (level) {
    case 'trace':
      return chalk.dim.gray;
    case 'debug':
      return chalk.gray;
    case 'info':
      return chalk.reset; // don't apply any style
    case 'warn':
      return chalk.yellow;
    case 'error':
      return chalk.red;
    default:
      throw new Error('Unknown log level: ' + level);
  }
}

exports.create = create;
