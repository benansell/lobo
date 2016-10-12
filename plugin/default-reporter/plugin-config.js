'use strict';

module.exports = function() {
  return {
    name: 'default-reporter',
    options: [
      {flags: '--failOnFocus', description: 'exit with non zero exit code when there are any focused tests'},
      {flags: '--showSkipped', description: 'Report skipped tests after the summary'}
    ]
  };
};
