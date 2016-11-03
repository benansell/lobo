'use strict';

module.exports = function() {
  return {
    'name': 'elm-test',
    'source-directories': ['runner', 'plugin/elm-test'],
    'dependencies': {
      'elm-community/elm-test': '3.0.0 <= v < 4.0.0',
      'mgold/elm-random-pcg': '4.0.2 <= v < 5.0.0'
    },
    'options': [
      {flags: '--seed <value>', description: 'initial seed value for fuzz tests; defaults to a random value'},
      {flags: '--runCount <value>', description: 'run count for fuzz tests; defaults to 100'}
    ]
  };
};
