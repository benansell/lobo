'use strict';

var rewire = require('rewire');
// var chai = require('chai');
// var sinon = require('sinon');
// var sinonChai = require('sinon-chai');
// var expect = chai.expect;
// chai.use(sinonChai);

describe('plugin', function() {
  describe('default-reporter', function() {
    rewire('./../../../../plugin/default-reporter/reporter-plugin');
  });
});
