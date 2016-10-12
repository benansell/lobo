'use strict';

var _ = require('lodash');
var util = require('./util');

function clean() {
  if (process.env.disableClean) {
    return;
  }

  util.cd('tests');
  util.clean();
  util.cd('..');
}

function contextPush(context, name) {
  context.push(name);
  util.cd(name);
}

function contextPop(context) {
  context.pop();
  util.cd('..');
}

function run(context, framework, args) {
  var baseDir = _.repeat('../', context.length);
  var command = 'node ' + baseDir + 'bin/lobo.js --interrupt=no --verbose --noWarn';

  if (framework) {
    command += ' --framework=' + framework;
  }

  if (args) {
    command += ' ' + args;
  }

  return util.execRaw(command);
}

module.exports = {
  clean: clean,
  contextPush: contextPush,
  contextPop: contextPop,
  run: run
};
