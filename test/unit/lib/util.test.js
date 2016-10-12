'use strict';

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

describe('util', function() {
  var util = require('./../../../lib/util');

  describe('checkNodeVersion', function() {
    var mockExit;
    var mockLogInfo;
    var mockLogError;
    var processMajor;
    var processMinor;
    var processPatch;

    beforeEach(function() {
      mockExit = sinon.stub(process, 'exit');

      var processVersion = process.versions.node.split('.');
      processMajor = parseInt(processVersion[0], 10);
      processMinor = parseInt(processVersion[1], 10);
      processPatch = parseInt(processVersion[2], 10);

      mockLogInfo = sinon.stub(console, 'info');
      mockLogError = sinon.stub(console, 'error');
    });

    afterEach(function() {
      mockExit.restore();
      mockLogInfo.restore();
      mockLogError.restore();
    });

    it('should throw error when major is not an integer', function() {
      expect(function() {
        util.checkNodeVersion(1.9, 2, 3);
      }).to.throw('major is not an integer');
    });

    it('should throw error when minor is not an integer', function() {
      expect(function() {
        util.checkNodeVersion(1, 2.9, 3);
      }).to.throw('minor is not an integer');
    });

    it('should throw error when patch is not an integer', function() {
      expect(function() {
        util.checkNodeVersion(1, 2, 3.9);
      }).to.throw('patch is not an integer');
    });

    it('should exit the process when major version is too low', function() {
      // act
      util.checkNodeVersion(processMajor + 1, 0, 0);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it('should exit the process when minor version is too low', function() {
      // act
      util.checkNodeVersion(processMajor, processMinor + 1, 0);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it('should exit the process when patch version is too low', function() {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch + 1);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it('should not exit the process version is at minimum', function() {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch);

      // assert
      expect(mockExit).not.to.have.been.calledWith(1);
    });

    it('should not exit the process version is above minimum', function() {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch - 1);

      // assert
      expect(mockExit).not.to.have.been.calledWith(1);
    });
  });
});
