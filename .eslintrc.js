module.exports = {
  "env": {
    "node": true
  },
  "extends": ["google"],
  "parserOptions": {
    "ecmaVersion": 6
  },
  "plugins": [
    "standard",
    "promise"
  ],
  "rules": {
    "comma-dangle": 0,
    "max-len": ["error", 120],
    "no-var": 0,
    "require-jsdoc": 0
  }
};
