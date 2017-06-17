'use strict';

var rewire = require('rewire');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

describe('lib', function() {
  describe('reporter', function() {
    var reporter = rewire('./../../../lib/reporter');

    describe('update', function() {
      var mockReporterPlugin;

      beforeEach(function() {
        mockReporterPlugin = sinon.spy();
        reporter.configure(mockReporterPlugin);
      });

      it('should report nothing when program.quiet is true', function() {
        // arrange
        reporter.__set__({program: {quiet: true}});

        // act
        reporter.update({outcome: 'PASSED'});

        // assert
        expect(mockReporterPlugin).not.to.have.been.called;
      });
    });
  });
});
