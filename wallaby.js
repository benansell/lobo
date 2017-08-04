"use strict";
// tslint:disable:no-require-imports
function config(w) {
    return {
        compilers: {
            "**/*.ts": w.compilers.typeScript({ typescript: require("typescript") })
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
module.exports = config;
//# sourceMappingURL=wallaby.js.map