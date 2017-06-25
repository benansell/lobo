'use strict';

module.exports = function() {
  return {
    name: 'default-reporter',
    options: [
      {flags: '--showSkip', description: 'report skipped tests after the summary'},
      {flags: '--showTodo', description: 'report todo tests after the summary'}
    ]
  };
};
