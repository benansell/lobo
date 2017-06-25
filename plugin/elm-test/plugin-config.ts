'use strict';

module.exports = function() {
  return {
    'name': 'elm-test',
    'source-directories': ['runner', 'plugin/elm-test'],
    'dependencies': {
      'elm-community/elm-test': '4.0.0 <= v < 5.0.0',
      'mgold/elm-random-pcg': '5.0.0 <= v < 6.0.0'
    },
    'options': [
      {flags: '--seed <value>', description: 'initial seed value for fuzz tests; defaults to a random value'},
      {flags: '--runCount <value>', description: 'run count for fuzz tests; defaults to 100'}
    ]
  };
};
