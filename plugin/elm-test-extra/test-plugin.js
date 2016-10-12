'use strict';

var program = require('commander');

function generateInitialSeed() {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

function initArgs() {
  return {
    seed: program.seed ? program.seed : generateInitialSeed(),
    runCount: program.runCount ? parseInt(program.runCount, 10) : 100
  };
}

module.exports = {
  initArgs: initArgs
};
