#!/usr/bin/env node
'use strict';

var logger = require('../lib/logger').create();

const _ = require('lodash');
var bluebird = require('bluebird');
var chalk = require('chalk');
var chokidar = require('chokidar');
var path = require('path');
var program = require('commander');
var shelljs = require('shelljs');
var tmp = require('tmp');

var builder = require('../lib/builder');
var runner = require('../lib/runner');
var util = require('../lib/util');

process.title = 'lobo';
util.checkNodeVersion(0, 11, 13);

var busy = false;
var ready = false;
var waiting = false;
var config;

try {
  config = configure();
  validateConfiguration();

  if (program.watch) {
    watch(config);
  } else {
    launch(config);
  }
} catch (err) {
  logger.debug(err.stack);
  logger.error(err.message);
  process.exit(1);
}

function launch(config) {
  config.testFile = generateTestFileName();

  var stages = [function() {
    return builder.build(config, program.testDirectory);
  }, function() {
    return runner.run(config);
  }];

  bluebird.Promise.mapSeries(stages, function(item) {
    return item();
  }).then(function() {
    logger.debug('launch success');
    if (program.watch) {
      done(config);
    }
  }).catch(function(err) {
    if (err instanceof ReferenceError) {
      handleUncaughtException(err);
      return;
    } else if (/Ran into a `Debug.crash` in module/.test(err)) {
      logger.error(err);
    } else {
      logger.debug('launch failed', err);
    }

    if (program.watch) {
      done(config);
    } else {
      process.exit(1);
    }
  });
}

function done(config) {
  logger.info('----------------------------------[ WAITING ]-----------------------------------');

  if (waiting === true) {
    waiting = false;
    busy = true;
    launch(config);
  } else {
    busy = false;
  }
}

function watch(config) {
  var paths = ['./elm-package.json'];

  // paths.push(__dirname);
  // paths.push(path.normalize(__dirname + '/../lib'));
  // paths.push(path.normalize(__dirname + '/../plugin/default-reporter'));

  var testElmPackage = builder.readElmPackageJson(path.join(program.testDirectory, 'elm-package.json'));

  if (testElmPackage && testElmPackage['source-directories']) {
    var dirs = testElmPackage['source-directories'];

    paths = _.map(dirs, function(p) {
      return path.normalize(path.join(process.cwd(), program.testDirectory, p));
    }).filter(function(p) {
      return shelljs.test('-e', p);
    }).concat(paths);
  }

  chokidar.watch(paths, {
    ignored: /(.*\/\..*)|(.*\/elm-stuff\/.*)/,
    persistent: true
  }).on('ready', function() {
    ready = true;
    launch(config);
  }).on('all', function(event, path) {
    logger.trace('watch - event: ' + event + ', path: ' + path);

    if (ready === false) {
      return;
    }

    logger.debug('Rebuild triggered by "' + event + '" at ' + path);

    if (busy) {
      waiting = true;
    } else {
      busy = true;
      launch(config);
    }
  });
}

process.on('uncaughtException', handleUncaughtException);

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

function generateTestFileName() {
  var tmpFile = tmp.fileSync({prefix: 'lobo-test-', postfix: '.js'});

  return tmpFile.name;
}

function configure() {
  var config = {
    testMainElm: 'UnitTest.elm'
  };

  program.on('--help', function() {
    showCustomHelp(config.testMainElm);
  });

  program
    .version('0.0.1')
    .option('--compiler <value>', 'path to compiler')
    .option('--debug', 'disables auto-cleanup of temp files')
    .option('--framework <value>', 'name of the testing framework to use', 'elm-test-extra')
    .option('--noInstall', 'prevents lobo from running elm-package install')
    .option('--noUpdate', 'prevents lobo updating the test elm-package.json')
    .option('--noWarn', 'hides elm make build warnings')
    .option('--prompt <value>', 'default the answer to any questions', /^(y[es])|(n[o])$/i, 'yes')
    .option('--quiet', 'only outputs build info, test summary and errors')
    .option('--reporter <value>', 'name of the reporter to use', 'default-reporter')
    .option('--testDirectory <value>', 'directory containing the tests to run', 'tests')
    .option('--verbose', 'outputs more detailed logging')
    .option('--veryVerbose', 'outputs very detailed logging')
    .option('--watch', 'watch for file changes and automatically rerun any effected tests');

  // parse args with allow unknown to find & load plugins with additional options
  program.allowUnknownOption(true);
  program.parse(process.argv);
  config.reporter = loadReporter();
  config.testFramework = loadTestFramework();

  // re-parse args with plugins loaded
  program.allowUnknownOption(false);
  program.parse(process.argv);
  logger.debug('options', program.opts());

  if (!program.debug) {
    logger.debug('enabling auto-cleanup of temp files');
    tmp.setGracefulCleanup();
  }

  if (program.verbose !== true && program.veryVerbose !== true) {
    logger.debug('silencing shelljs');
    shelljs.config.silent = true;
  }

  // configure shelljs to throw errors when any command errors
  shelljs.config.fatal = true;

  if (program.prompt) {
    config.prompt = program.prompt.toLowerCase()[0] === 'y';
  }

  config.noInstall = program.noInstall === true;
  config.noUpdate = program.noUpdate === true;
  config.noWarn = program.noWarn === true;
  config.reportProgress = true;

  if (program.compiler) {
    config.compiler = path.normalize(program.compiler);
  }

  logger.trace('config', config);

  return config;
}

function showCustomHelp() {
  var maxOptionLength = 29;
  logger.info('  Testing Frameworks:');
  logger.info('');
  showCustomHelpForPlugins('testing framework', 'test-plugin', maxOptionLength);

  logger.info('  Reporters:');
  logger.info('');
  showCustomHelpForPlugins('reporter', 'reporter-plugin', maxOptionLength);
}

function showCustomHelpForPlugins(type, fileSpec, maxOptionLength) {
  var plugins = util.availablePlugins(fileSpec);

  _.forEach(plugins, function(name) {
    logger.info('   ' + chalk.underline(name) + ':');
    logger.info('');
    var config = util.getPluginConfig(type, name, fileSpec);

    if (config && config.options && config.options.length > 0) {
      _.forEach(config.options, function(option) {
        var prefix = util.padRight('    ' + option.flags, maxOptionLength);
        logger.info(prefix + option.description);
      });
    }
    logger.info('');
  });
}

function validateConfiguration() {
  var exit = false;
  if (program.compiler) {
    if (!shelljs.test('-e', program.compiler)) {
      logger.error('');
      logger.error('Unable to find the elm compiler');
      logger.error('Please check that it exists at the supplied path:');
      logger.error(path.resolve(program.compiler));
      exit = true;
    }
  }

  var testsElm = program.testDirectory + '/Tests.elm';

  if (!shelljs.test('-e', testsElm)) {
    logger.error('');
    logger.error('Unable to find "Tests.elm"');
    logger.error('Please check that it exists in the test directory:');
    logger.error(path.resolve(program.testDirectory));
    logger.info('');
    logger.info('You can override the default location ("./tests") by running:');
    logger.info('lobo --testDirectory [directory containing Tests.elm]');
    exit = true;
  }

  if (exit === true) {
    logger.info('');
    logger.info('For further help run:');
    logger.info('lobo --help');
    logger.info('');
    process.exit(1);
  }
}

function loadReporter() {
  var plugin = util.getPlugin('reporter', program.reporter, 'reporter-plugin');
  return loadPlugin('reporter', plugin);
}

function loadTestFramework() {
  var plugin = util.getPlugin('testing framework', program.framework, 'test-plugin');
  return loadPlugin('testing framework', plugin);
}

function loadPlugin(type, plugin) {
  if (!plugin || !plugin.config || !plugin.config.options) {
    return plugin;
  }

  _.forEach(plugin.config.options, function(opt) {
    if (opt.flags) {
      program.option(opt.flags, opt.description);
    } else {
      logger.error('Ignoring ' + type + ' option with missing flags property', opt);
    }
  });

  return plugin;
}

function handleUncaughtException(error) {
  var errorString = null;

  if (error) {
    errorString = error.toString();
  }

  if (error instanceof ReferenceError) {
    if (error.stack && error.stack.match(new RegExp(config.testFile))) {
      if (/ElmTest.*Plugin\$findTests is not defined/.test(error)) {
        logger.error('Error running the tests. This is usually caused by an npm upgrade to lobo: ');
        logger.info('');
        logger.error(errorString);
        logger.info('');
        logger.error('Please delete tests/elm-stuff and try again');
      } else {
        logger.error('Error running the tests. This is usually caused by an elm package using objects that ' +
          'are found in the browser but not in a node process');
        logger.info('');
        logger.error(errorString);
        logger.info('');
        logger.error('Please raise an issue against lobo to request adding support for the elm-package that ' +
          'is referencing the above browser object');
      }
    } else {
      logger.error('Unhandled exception', errorString);
    }
    logger.debug(error.stack);
  } else {
    logger.error('Unhandled exception', errorString);
    logger.debug(error.stack);
  }

  if (config && program.watch) {
    done(config);
    return;
  }

  process.exit(1);
}

