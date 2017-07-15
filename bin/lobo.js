#!/usr/bin/env node

var main = require("../lib/main");
var lobo = main.createLobo();

process.title = "lobo";
process.on("uncaughtException", function(err) {
  lobo.handleUncaughtException(err);
});

lobo.execute();
