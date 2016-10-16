'use strict';

var rewire = require('rewire');
var chai = require('chai');
var chalk = require('chalk');
var expect = chai.expect;

describe('plugin default-reporter reporter-plugin', function() {
  var reporter = rewire('./../../../../plugin/default-reporter/reporter-plugin');

  describe('runArgs', function() {
    it('should set initArgs to the supplied value', function() {
      // act
      reporter.runArgs('foo');

      // assert
      expect(reporter.__get__('initArgs')).to.equal('foo');
    });
  });

  describe('update', function() {
    var original;
    var output;

    function write(str) {
      output += str;
    }

    beforeEach(function() {
      output = '';
      original = process.stdout.write;
      process.stdout.write = write;
    });

    afterEach(function() {
      process.stdout.write = original;
    });

    it('should report "." when a test has "PASSED"', function() {
      // act
      reporter.update('PASSED');

      // assert
      expect(output).to.equal('.');
    });

    it('should report "!" when a test has "FAILED"', function() {
      // act
      reporter.update('FAILED');

      // assert
      expect(output).to.equal(chalk.red('!'));
    });

    it('should report "?" when a test has "SKIPPED"', function() {
      // act
      reporter.update('SKIPPED');

      // assert
      expect(output).to.equal(chalk.yellow('?'));
    });

    it('should report " " when a test has unknown result', function() {
      // act
      reporter.update('foo bar');

      // assert
      expect(output).to.equal(' ');
    });

    it('should report nothing when program.quiet is true', function() {
      // arrange
      reporter.__set__({program: {quiet: true}});

      // act
      reporter.update('PASSED');

      // assert
      expect(output).to.equal('');
    });
  });
});
