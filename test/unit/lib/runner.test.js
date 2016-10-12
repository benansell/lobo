'use strict';

var rewire = require('rewire');
// var chai = require('chai');
// var sinon = require('sinon');
// var sinonChai = require('sinon-chai');
// var expect = chai.expect;
// chai.use(sinonChai);

describe('lib', function() {
  describe('runner', function() {
    rewire('./../../../lib/runner');
  });
});
