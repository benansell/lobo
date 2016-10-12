'use strict';

var logger = require('./logger').create();

var _ = require('lodash');
var levenshtein = require('fast-levenshtein');
var path = require('path');
var shelljs = require('shelljs');

function availablePlugins(fileSpec) {
  var pattern = new RegExp(fileSpec);
  var pluginDirectory = path.resolve(__dirname, '..', 'plugin');
  var files = shelljs.find(pluginDirectory).filter(function(file) {
    return file.match(pattern);
  });

  return _.map(files, function(file) {
    var pluginPath = path.relative(pluginDirectory, file);
    return path.dirname(pluginPath);
  });
}

function checkNodeVersion(major, minor, patch) {
  if (typeof major !== "number" || !Number.isInteger(major)) {
    throw new Error('major is not an integer', major);
  }

  if (typeof minor !== "number" || !Number.isInteger(minor)) {
    throw new Error('minor is not an integer', major);
  }

  if (typeof patch !== "number" || !Number.isInteger(patch)) {
    throw new Error('patch is not an integer', major);
  }

  var nodeVersionString = process.versions.node;
  var nodeVersion = _.map(_.split(nodeVersionString, '.'), _.parseInt);

  if ((nodeVersion[0] < major) ||
    (nodeVersion[0] === major && nodeVersion[1] < minor) ||
    (nodeVersion[0] === major && nodeVersion[1] === minor && nodeVersion[2] < patch)) {
    logger.info('using node v' + nodeVersionString);
    logger.error('lobo requires node v' + major + '.' + minor + '.' + patch + ' or greater ' +
      '- upgrade the installed version of node and try again');
    process.exit(1);
  }
}

function closestMatch(name, items) {
  return _.minBy(items, function(i) {
    return levenshtein.get(name, i);
  });
}

function getPlugin(type, pluginName, fileSpec) {
  try {
    var plugin = require(path.join('..', 'plugin', pluginName, fileSpec));
    logger.debug(pluginName + ' plugin loaded');
    plugin.config = getPluginConfig(type, pluginName, fileSpec);
    logger.trace('plugin', plugin);

    return plugin;
  } catch (err) {
    if (err && err instanceof SyntaxError) {
      logger.error('Unable to load ' + pluginName + ' due to a syntax error in ' + pluginName + '/' + fileSpec + '.js');
    } else {
      logger.error(pluginName + ' ' + type + ' not found');
      var plugins = availablePlugins(fileSpec);
      logger.error('Did you mean "' + closestMatch(pluginName, plugins) + '" ?');
    }

    process.exit(1);
  }
}

function getPluginConfig(type, pluginName, fileSpec) {
  try {
    var config = require(path.join('..', 'plugin', pluginName, 'plugin-config'))();
    logger.debug(pluginName + ' plugin configured');
    logger.trace('plugin configuration', config);
    return config;
  } catch (err) {
    if (err && err instanceof SyntaxError) {
      logger.error('Unable to load ' + pluginName + ' due to a syntax error in ' + pluginName + '/plugin-config.js');
    } else {
      logger.error(pluginName + ' ' + type + ' configuration not found');
      var plugins = availablePlugins(fileSpec);
      logger.error('Did you mean "' + closestMatch(pluginName, plugins) + '" ?');
    }

    process.exit(1);
  }
}

function padRight(value, length, spacer) {
  if (!spacer) {
    spacer = ' ';
  }

  return (value.toString().length < length) ? padRight(value + spacer, length, spacer) : value;
}

function wait(delayInMilliseconds) {
  var endTime = delayInMilliseconds + new Date().getTime();

  while (new Date() < endTime) {
  }
}

module.exports = {
  availablePlugins: availablePlugins,
  checkNodeVersion: checkNodeVersion,
  closestMatch: closestMatch,
  getPlugin: getPlugin,
  getPluginConfig: getPluginConfig,
  padRight: padRight,
  wait: wait
};
