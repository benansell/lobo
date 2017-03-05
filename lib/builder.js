'use strict';

var logger = require('./logger').create();

const _ = require('lodash');
var bluebird = require('bluebird');
var chalk = require('chalk');
var childProcess = require('child_process');
var fs = require('fs');
const path = require('path');
var promptly = require('promptly');
var shelljs = require('shelljs');

var elmPackageFileName = 'elm-package.json';
var yOrN = chalk.dim(' (Y/n)');

function build(config, testDirectory) {
  logger.info('-----------------------------------[ BUILD ]------------------------------------');

  var baseElmPackagePath = elmPackageFileName;
  var testElmPackagePath = path.join(testDirectory, elmPackageFileName);
  var steps = [];

  if (config.noUpdate) {
    logger.info('Ignored sync of base and test elm-package.json files due to configuration');
  } else {
    steps = steps.concat([function() {
      return ensureElmPackageExists(config, baseElmPackagePath, 'current');
    }, function() {
      return ensureElmPackageExists(config, testElmPackagePath, 'tests');
    }, function() {
      return syncTestElmPackage(config, baseElmPackagePath, testElmPackagePath);
    }]);
  }

  steps = steps.concat([function() {
    return installDependencies(config, testDirectory);
  }, function() {
    return make(config, testDirectory);
  }]);

  return bluebird.Promise.mapSeries(steps, function(item) {
    return item();
  });
}

function ensureElmPackageExists(config, elmPackagePath, location) {
  return new bluebird.Promise(function(resolve, reject) {
    if (shelljs.test('-e', elmPackagePath)) {
      resolve();
      return;
    }

    if (!config.prompt) {
      runElmPackageInstall(config, path.dirname(elmPackagePath), false, resolve, reject);
      return;
    }

    promptly.confirm('Unable to find elm-package.json in the ' + location + ' directory' +
      '\n\nMay I create a minimal elm-package.json for you?' + yOrN, function(err, value) {
      if (err) {
        reject(err);
      } else if (value === true) {
        runElmPackageInstall(config, path.dirname(elmPackagePath), true, resolve, reject);
      } else {
        reject();
      }
    });
  });
}

function syncTestElmPackage(config, baseElmPackagePath, testElmPackagePath) {
  var steps = [function() {
    return readElmPackage(baseElmPackagePath, testElmPackagePath);
  }, function(result) {
    return updateSourceDirectories(config, baseElmPackagePath, result.base, testElmPackagePath, result.test);
  }, function(result) {
    return updateDependencies(config, result.base, testElmPackagePath, result.test);
  }];

  var value = null;
  return bluebird.Promise.mapSeries(steps, function(item) {
    return item(value).then(function(result) {
      value = result;
    });
  });
}

function readElmPackage(baseElmPackagePath, testElmPackagePath) {
  return new bluebird.Promise(function(resolve, reject) {
    var baseElmPackage = readElmPackageJson(baseElmPackagePath);

    if (!baseElmPackage) {
      logger.error('Unable to read the main elm-package.json file. Please check that is a valid json file');
      reject();
    }

    var testElmPackage = readElmPackageJson(testElmPackagePath);

    if (!testElmPackage) {
      logger.error('Unable to read the test elm-package.json file. Please check that is a valid json file');
      reject();
    }

    resolve({base: baseElmPackage, test: testElmPackage});
  });
}

function updateSourceDirectories(config, baseElmPackagePath, baseElmPackage, testElmPackagePath, testElmPackage) {
  return new bluebird.Promise(function(resolve, reject) {
    var sourceDirectories = mergeSourceDirectories(baseElmPackage, baseElmPackagePath, testElmPackage,
      testElmPackagePath, config.testFramework);
    var diff = _.difference(sourceDirectories, testElmPackage['source-directories']);

    if (diff.length === 0) {
      resolve({base: baseElmPackage, test: testElmPackage});
      return;
    }

    if (!config.prompt) {
      testElmPackage = updateSourceDirectoriesAction(sourceDirectories, testElmPackagePath, testElmPackage);
      resolve({base: baseElmPackage, test: testElmPackage});
      return;
    }

    promptly.confirm('The source-directories of the test elm-package.json needs to be updated to ' +
      'contain:\n' + diff.join('\n') + '\n\nMay I add them to elm-package.json for you?' + yOrN, function(err, value) {
      if (err) {
        reject(err);
      } else if (value === true) {
        testElmPackage = updateSourceDirectoriesAction(sourceDirectories, testElmPackagePath, testElmPackage);
        resolve({base: baseElmPackage, test: testElmPackage});
      } else {
        reject();
      }
    });
  });
}

function updateSourceDirectoriesAction(sourceDirectories, testElmPackagePath, testElmPackage) {
  testElmPackage['source-directories'] = sourceDirectories;
  fs.writeFileSync(testElmPackagePath, JSON.stringify(testElmPackage, null, 4));

  return testElmPackage;
}

function updateDependencies(config, baseElmPackage, testElmPackagePath, testElmPackage) {
  return new bluebird.Promise(function(resolve, reject) {
    var dependencies = mergeDependencies(baseElmPackage, testElmPackage, config.testFramework);
    var existing = _.toPairs(testElmPackage.dependencies);

    var diff = _.filter(dependencies, function(base) {
      return dependencyExists(existing, base);
    });

    if (diff.length === 0) {
      resolve({base: baseElmPackage, test: testElmPackage});
      return;
    }

    var diffString = _.map(diff, function(kp) {
      return kp[0] + ': ' + kp[1];
    });

    if (!config.prompt) {
      testElmPackage = updateDependenciesAction(dependencies, testElmPackagePath, testElmPackage);
      resolve({base: baseElmPackage, test: testElmPackage});
      return;
    }

    promptly.confirm('The dependencies of the test elm-package.json need to be updated to contain:\n' +
      diffString.join('\n') + '\n\nMay I add them to elm-package.json for you?' + yOrN, function(err, value) {
      if (err) {
        reject(err);
      } else if (value === true) {
        updateDependenciesAction(dependencies, testElmPackagePath, testElmPackage);
        resolve({base: baseElmPackage, test: testElmPackage});
      } else {
        reject();
      }
    });
  });
}

function updateDependenciesAction(dependencies, testElmPackagePath, testElmPackage) {
  var sortedDependencies = _.sortBy(dependencies, function(kp) {
    return kp[0];
  });

  testElmPackage.dependencies = _.fromPairs(sortedDependencies);
  fs.writeFileSync(testElmPackagePath, JSON.stringify(testElmPackage, null, 4));
}

function readElmPackageJson(path) {
  try {
    var raw = fs.readFileSync(path);
    return JSON.parse(raw);
  } catch (err) {
    logger.debug(err);
    return null;
  }
}

function mergeSourceDirectories(baseElmPackage, baseElmPackagePath, testElmPackage, testElmPackagePath, testFramework) {
  var sourceDirectories = _.clone(testElmPackage['source-directories']);

  if (!sourceDirectories) {
    sourceDirectories = [];
  }

  if (sourceDirectories.indexOf('.') === -1) {
    sourceDirectories = sourceDirectories.push('.');
  }

  sourceDirectories = addSourceDirectories(baseElmPackage['source-directories'], path.dirname(baseElmPackagePath),
    testElmPackagePath, sourceDirectories);

  sourceDirectories = addSourceDirectories(testFramework.config['source-directories'], path.join(__dirname, '..'),
    testElmPackagePath, sourceDirectories);

  return sourceDirectories;
}

function addSourceDirectories(additions, additionDir, testElmPackagePath, sourceDirectories) {
  if (!additions) {
    return sourceDirectories;
  }

  var relativePath = path.relative(path.dirname(testElmPackagePath), additionDir);
  var relativeSourceDirectories = _.map(additions, function(p) {
    return path.join(relativePath, p).replace(/\\/g, '/');
  }).filter(function(p) {
    return sourceDirectories.indexOf(p) === -1;
  });

  return sourceDirectories.concat(relativeSourceDirectories);
}

function mergeDependencies(baseElmPackage, testElmPackage, testFramework) {
  var dependencies = _.toPairs(testElmPackage.dependencies);

  if (!dependencies) {
    dependencies = [];
  }

  if (baseElmPackage.dependencies) {
    var baseDependencies = _.toPairs(baseElmPackage.dependencies)
      .filter(function(base) {
        return dependencyExists(dependencies, base);
      });

    dependencies = dependencies.concat(baseDependencies);
  }

  if (testFramework.config.dependencies) {
    var testFrameworkDependencies = _.toPairs(testFramework.config.dependencies)
      .filter(function(base) {
        return dependencyExists(dependencies, base);
      });

    dependencies = dependencies.concat(testFrameworkDependencies);
  }

  return dependencies;
}

function dependencyExists(dependencies, candidate) {
  return !_.find(dependencies, function(x) {
    return candidate[0] === x[0] && candidate[1] === x[1];
  });
}

function installDependencies(config, testDirectory) {
  return new bluebird.Promise(function(resolve, reject) {
    runElmPackageInstall(config, testDirectory, config.prompt, resolve, reject);
  });
}

function runElmPackageInstall(config, directory, prompt, resolve, reject) {
  if (config.noInstall) {
    logger.info('Ignored running of elm-package due to configuration');
    resolve();

    return;
  }

  var command = 'elm-package';

  if (config.compiler) {
    command = path.join(config.compiler, command);
  }

  command += ' install';

  if (!prompt) {
    command += ' --yes';
  }

  try {
    // run as child process using current process stdio so that colored output is returned
    var options = {cwd: directory, stdio: [process.stdin, process.stdout, process.stderr]};
    childProcess.execSync(command, options);
    resolve();
  } catch (err) {
    logger.debug('elm package install failed in the test directory');
    logger.debug(err);
    reject(err);
  }
}

function make(config, testDirectory) {
  return new bluebird.Promise(function(resolve, reject) {
    var pluginDirectory = path.resolve(__dirname, '..', 'plugin');
    var testStuffMainElm = path.join(pluginDirectory, config.testFramework.config.name, config.testMainElm);
    var command = 'elm-make';

    if (config.compiler) {
      command = path.join(config.compiler, command);
    }

    command += ' ' + testStuffMainElm + ' --output=' + config.testFile;

    if (!config.prompt) {
      command += ' --yes';
    }

    if (!config.noWarn) {
      command += ' --warn';
    }

    try {
      // run as child process using current process stdio so that colored output is returned
      var options = {cwd: testDirectory, stdio: [process.stdin, process.stdout, process.stderr]};
      childProcess.execSync(command, options);
      resolve();
    } catch (err) {
      console.log('');
      console.log(chalk.red.bold('  BUILD FAILED'));
      console.log('');
      logger.debug(err);
      reject(err);
    }
  });
}

module.exports = {
  build: build,
  readElmPackageJson: readElmPackageJson
};
