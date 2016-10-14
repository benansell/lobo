'use strict';

var path = require('path');
var shelljs = require('shelljs');

function cd(path) {
  if (shelljs.cd(path).code !== 0) {
    throw new Error('cd failed for ' + path + '. Current directory: ' + shelljs.pwd());
  }
}

function exec(command) {
  if (shelljs.exec(command).code !== 0) {
    throw new Error('exec failed for ' + command);
  }
}

function execRaw(command) {
  var showExecution = process.env.noisyTestRun === 'true';
  return shelljs.exec(command, {silent: !showExecution});
}

function rmFile(file) {
  if (!shelljs.test('-e', file)) {
    return;
  }

  if (shelljs.rm(file).code !== 0) {
    throw new Error('rm failed for ' + file);
  }
}

function rmDir(path) {
  if (!shelljs.test('-e', path)) {
    return;
  }

  if (shelljs.rm('-r', path).code !== 0) {
    throw new Error('rm -r failed for ' + path);
  }
}

function clean() {
  rmFile('elm-package.json');
  rmDir('elm-stuff');
}

function initializeTestContext(dirname) {
  var dir = dirname;
  var testContext = [];

  while (/test/.test(dir)) {
    testContext.push(path.basename(dir));
    dir = path.dirname(dir);
  }

  testContext.reverse();

  return testContext;
}

module.exports = {
  cd: cd,
  clean: clean,
  exec: exec,
  execRaw: execRaw,
  initializeTestContext: initializeTestContext
};
