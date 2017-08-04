import * as wallaby from "wallabyjs";

// tslint:disable:no-require-imports

function config(w: wallaby.IWallabyConfig): object {
  return {

    compilers: {
      "**/*.ts": w.compilers!.typeScript({typescript: require("typescript")})
    },

    env: {
      type: "node"
    },

    files: [
      "bin/**/*.ts",
      "lib/**/*.ts",
      "plugin/**/*.ts"
    ],

    tests: [
      "test/unit/**/*.test.ts"
    ]
  };
}

// tslint:enable:no-require-imports

export = config;
