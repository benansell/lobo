'use strict';

module.exports = function() {
  return {
    'name': 'elm-test-extra',
    'source-directories': ['runner', 'plugin/elm-test-extra'],
    'dependencies': {
      'benansell/lobo-elm-test-extra': '2.0.0 <= v < 3.0.0',
      'elm-community/elm-test': '4.0.0 <= v < 5.0.0',
      'mgold/elm-random-pcg': '5.0.0 <= v < 6.0.0'
    },
    'options': [
      {flags: '--seed <value>', description: 'initial seed value for fuzz tests; defaults to a random value'},
      {flags: '--runCount <value>', description: 'run count for fuzz tests; defaults to 100'}
    ]
  };
};
