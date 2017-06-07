'use strict';

module.exports = function() {
  return {
    name: 'default-reporter',
    options: [
      {flags: '--failOnOnly', description: 'exit with non zero exit code when there are any only tests'},
      {flags: '--failOnSkip', description: 'exit with non zero exit code when there are any skip tests'},
      {flags: '--failOnTodo', description: 'exit with non zero exit code when there are any todo tests'},
      {flags: '--showSkip', description: 'Report skipped tests after the summary'},
      {flags: '--showTodo', description: 'Report todo tests after the summary'}
    ]
  };
};
