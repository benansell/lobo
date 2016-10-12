module.exports = function() {
  return {
    files: [
      'lib/**/*.js',
      'plugin/**/*.js'
    ],

    tests: [
      'test/unit/**/*.test.js'
    ],

    env: {
      type: 'node'
    }
  };
};
