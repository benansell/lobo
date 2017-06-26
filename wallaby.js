module.exports = function(w) {
  return {
    files: [
      "lib/**/*.ts",
      "plugin/**/*.ts"
    ],

    tests: [
      "test/unit/**/*.test.ts"
    ],

    env: {
      type: "node"
    },

    compilers: {
      "**/*.ts": w.compilers.typeScript({typescript: require("typescript")})
    }
  };
};
