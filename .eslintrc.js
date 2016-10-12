module.exports = {
  "env": {
    "node": true
  },
  "extends": ["google"],
  "plugins": [
    "standard",
    "promise"
  ],
  "rules": {
    "max-len": ["error", 120],
    "require-jsdoc": 0
  }
};
