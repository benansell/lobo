'use strict';

var rewire = require('rewire');
var chai = require('chai');
var expect = chai.expect;

describe('plugin', function() {
  describe('elm-test', function() {
    var plugin = rewire('./../../../../plugin/elm-test/test-plugin');

    describe('initArgs', function() {
      it('should use the supplied seed value when it exists', function() {
        // arrange
        plugin.__set__({program: {seed: 123}});

        // act
        var actual = plugin.initArgs();

        // assert
        expect(actual.seed).to.equal(123);
      });

      it('should use the supplied runCount value when it exists', function() {
        // arrange
        plugin.__set__({program: {runCount: 123}});

        // act
        var actual = plugin.initArgs();

        // assert
        expect(actual.runCount).to.equal(123);
      });

      it('should generate a seed value no value is supplied', function() {
        // arrange
        plugin.__set__({program: {seed: undefined}});

        // act
        var actual = plugin.initArgs();

        // assert
        expect(actual.seed).not.to.be.undefined;
      });

      it('should generate a different seed value each time when no value is supplied', function() {
        // arrange
        plugin.__set__({program: {seed: undefined}});

        // act
        var first = plugin.initArgs();
        var second = plugin.initArgs();

        // assert
        expect(first.seed).not.to.equal(second.seed);
      });
    });
  });
});
