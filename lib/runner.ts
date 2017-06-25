'use strict';

var bluebird = require('bluebird');
var logger = require('./logger').create();
var reporter = require('./reporter');

function run(config) {
  reporter.configure(config.reporter);

  return new bluebird.Promise(function(resolve, reject) {
    logger.info('-----------------------------------[ TEST ]-------------------------------------');

    // add to the global scope browser global properties that are used by elm imports
    global.document = {}; // Required by Dom
    global.window = {}; // Required by AnimationFrame

    var Elm = require(config.testFile);

    if (!Elm) {
      throw new Error('Elm program not found', config.testFile);
    }

    var initArgs = config.testFramework.initArgs();
    logger.debug('Initializing Elm worker', initArgs);
    config.reporter.runArgs(initArgs);
    var app = Elm.UnitTest.worker(initArgs);

    logger.debug('Subscribing to ports');
    app.ports.begin.subscribe(makeTestRunBegin(reject));
    app.ports.end.subscribe(makeTestRunComplete(resolve, reject));
    app.ports.progress.subscribe(makeTestRunProgress(reject));

    logger.debug('Running tests');
    app.ports.runTests.send({
      reportProgress: config.reportProgress
    });
  });
}

function makeTestRunBegin(reject) {
  return function(message) {
    try {
      logger.debug('Test run beginning', message);
      reporter.init(message);
    } catch (err) {
      reject(err);
    }
  };
}

function makeTestRunProgress(reject) {
  return function(message) {
    try {
      reporter.update(message);
      logger.trace('Test run progress', message);
    } catch (err) {
      reject(err);
    }
  };
}

function makeTestRunComplete(resolve, reject) {
  return function(message) {
    try {
      logger.trace('Test run complete', message);
      var result = reporter.finish(message);

      if (result === true) {
        resolve();
      } else {
        reject();
      }
    } catch (err) {
      reject(err);
    }
  };
}

module.exports = {
  run: run
};
