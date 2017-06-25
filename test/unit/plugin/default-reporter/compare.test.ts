'use strict';

var chai = require('chai');
var expect = chai.expect;
var compare = require('./../../../../plugin/default-reporter/compare');

describe('plugin default-reporter compare', function() {
  describe('diff', function() {
    it('should hint to whole value when a union type', function() {
      // act
      var actual = compare.diff('Foo', 'FooBar');

      // assert
      expect(actual.left).to.equal('   ');
      expect(actual.right).to.equal('   ^^^');
    });

    it('should not add hint to position of quotes in string value', function() {
      // act
      var actual = compare.diff('"foobar"', '"baz"');

      // assert
      expect(actual.left).to.equal(' ^^^^^^ ');
      expect(actual.right).to.equal('     ');
    });

    it('should not add hint two empty lists', function() {
      // act
      var actual = compare.diff('[]', '[]');

      // assert
      expect(actual.left).to.equal('  ');
      expect(actual.right).to.equal('  ');
    });

    it('should add hint for single item list with different values', function() {
      // act
      var actual = compare.diff('[1]', '[2]');

      // assert
      expect(actual.left).to.equal('   ');
      expect(actual.right).to.equal(' ^ ');
    });

    it('should not add hint to position of brackets in list value', function() {
      // act
      var actual = compare.diff('[1,2,3]', '[45,6,7]');

      // assert
      expect(actual.left).to.equal('       ');
      expect(actual.right).to.equal(' ^^ ^ ^ ');
    });

    it('should add hint to differences in list values', function() {
      // act
      var actual = compare.diff('[1,2,3]', '[5,6]');

      // assert
      expect(actual.left).to.equal('     ^ ');
      expect(actual.right).to.equal(' ^ ^ ');
    });

    it('should add hint to differences in list values', function() {
      // act
      var actual = compare.diff('[1,2]', '[5,6,7]');

      // assert
      expect(actual.left).to.equal('     ');
      expect(actual.right).to.equal(' ^ ^ ^ ');
    });

    it('should add hint to differences when union', function() {
      // act
      var actual = compare.diff('Nothing', 'Just 1');

      // assert
      expect(actual.left).to.equal('^^^^^^^');
      expect(actual.right).to.equal('     ^');
    });

    it('should add hint to differences when union with brackets', function() {
      // act
      var actual = compare.diff('Foo', 'Bar (Just 1)');

      // assert
      expect(actual.left).to.equal('   ');
      expect(actual.right).to.equal('^^^ ^^^^^^^^');
    });

    it('should add hint to differences when union with brackets', function() {
      // act
      var actual = compare.diff('Foo "bar" True', 'Baz (Just 1)');

      // assert
      expect(actual.left).to.equal('          ^^^^');
      expect(actual.right).to.equal('^^^ ^^^^^^^^');
    });

    it('should add hint to differences when union with different records no common fields', function() {
      // act
      var actual = compare.diff('Foo { id = 1 }', 'Baz { name = "baz" }');

      // assert
      expect(actual.left).to.equal('    ^^^^^^^^^^');
      expect(actual.right).to.equal('^^^ ^^^^^^^^^^^^^^^^');
    });

    it('should add hint to differences when union with different records 1 common field', function() {
      // act
      var actual = compare.diff('Foo { id = 1 }', 'Baz { id = 2, name = "baz" }');

      // assert
      expect(actual.left).to.equal('              ');
      expect(actual.right).to.equal('^^^        ^  ^^^^^^^^^^^^  ');
    });

    it('should add hint to differences when union with different records 1 common field', function() {
      // act
      var actual = compare.diff('{ id = 1, version = "bar" }', '{ id = 2, name = "foo", version = "baz" }');

      // assert
      expect(actual.left).to.equal('                           ');
      expect(actual.right).to.equal('       ^  ^^^^^^^^^^^^               ^   ');
    });

    it('should not add hint to position of brackets in record value', function() {
      // act
      var actual = compare.diff('{ id = 1 }', '{ id = 2 }');

      // assert
      expect(actual.left).to.equal('          ');
      expect(actual.right).to.equal('       ^  ');
    });

    it('should not add hint when records only contain empty lists', function() {
      // act
      var actual = compare.diff('{ items = [] }', '{ items = [] }');

      // assert
      expect(actual.left).to.equal('              ');
      expect(actual.right).to.equal('              ');
    });

    it('should hint record type with unsorted keys', function() {
      // act
      var actual = compare.diff('{ id = 1, value = 10 }', '{ value = 10, id = 2 }');

      // assert
      expect(actual.left).to.equal('                      ');
      expect(actual.right).to.equal('                   ^  ');
    });

    it('should not hint embedded identical records', function() {
      // act
      var actual = compare.diff('{ id = 1, position = { x = 1, y = 2 }}', '{ id = 1, position = { x = 1, y = 2 }}');

      // assert
      expect(actual.left).to.equal('                                      ');
      expect(actual.right).to.equal('                                      ');
    });

    it('should hint embedded different records', function() {
      // act
      var actual = compare.diff('{ id = 1, position = { x = 1, y = 2 }}', '{ id = 1, position = { x = 1, y = 3 }}');

      // assert
      expect(actual.left).to.equal('                                      ');
      expect(actual.right).to.equal('                                  ^   ');
    });

    it('should not add hint list of 1 item of identical records', function() {
      // act
      var actual = compare.diff('[{ id = 1 }]', '[{ id = 2 }]');

      // assert
      expect(actual.left).to.equal('            ');
      expect(actual.right).to.equal('        ^   ');
    });

    it('should not hint list of identical records', function() {
      // act
      var actual = compare.diff('[{ id = 1 },{ id = 2 }]', '[{ id = 1 },{ id = 2 }]');

      // assert
      expect(actual.left).to.equal('                       ');
      expect(actual.right).to.equal('                       ');
    });

    it('should hint list of records where one list is empty and other list has 1 item', function() {
      // act
      var actual = compare.diff('[]', '[{ id = 1 }]');

      // assert
      expect(actual.left).to.equal('  ');
      expect(actual.right).to.equal(' ^^^^^^^^^^ ');
    });

    it('should hint list of records where one list is empty and other list has 2 items', function() {
      // act
      var actual = compare.diff('[]', '[{ id = 1 },{ id = 1 }]');

      // assert
      expect(actual.left).to.equal('  ');
      expect(actual.right).to.equal(' ^^^^^^^^^^^^^^^^^^^^^ ');
    });

    it('should not hint list of identical records', function() {
      // act
      var actual = compare.diff('[{ id = 1 },{ id = 2 }]', '[{ id = 1 },{ id = 2 }]');

      // assert
      expect(actual.left).to.equal('                       ');
      expect(actual.right).to.equal('                       ');
    });

    it('should hint list of records of different lengths 1 key', function() {
      // act
      var actual = compare.diff('{ items = [{ id = 1 }]}', '{ items = [] }');

      // assert
      expect(actual.left).to.equal('           ^^^^^^^^^^  ');
      expect(actual.right).to.equal('              ');
    });

    it('should hint list of records of different lengths 2 keys', function() {
      // act
      var actual = compare.diff('{ items = [{ id = 1, version = 2 }]}', '{ items = [] }');

      // assert
      expect(actual.left).to.equal('           ^^^^^^^^^^^^^^^^^^^^^^^  ');
      expect(actual.right).to.equal('              ');
    });

    it('should hint list of records of different lengths 2 keys', function() {
      // act
      var actual = compare.diff('{ items = [{ id = 1, version = 2 },{ id = 2, version = 3 }]}', '{ items = [] }');

      // assert
      expect(actual.left).to.equal('           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ');
      expect(actual.right).to.equal('              ');
    });
  });

  describe('compare.diffValue', function() {
    it('should not add a left or right hint when the inputs are equal', function() {
      // act
      var actual = compare.diffValue('foo', 'foo');

      // assert
      expect(actual.left).to.equal('   ');
      expect(actual.right).to.equal('   ');
    });

    it('should add a right hint when the inputs are different but of equal length', function() {
      // act
      var actual = compare.diffValue('bar', 'baz');

      // assert
      expect(actual.left).to.equal('   ');
      expect(actual.right).to.equal('  ^');
    });

    it('should add a right hint when the inputs are different and right is longer', function() {
      // act
      var actual = compare.diffValue('foo', 'foobar');

      // assert
      expect(actual.left).to.equal('   ');
      expect(actual.right).to.equal('   ^^^');
    });

    it('should add a left hint when the inputs are different and left is longer contains right',
      function() {
        // act
        var actual = compare.diffValue('foobar', 'foo');

        // assert
        expect(actual.left).to.equal('   ^^^');
        expect(actual.right).to.equal('   ');
      });

    it('should add a left hint when the inputs are different and left is longer contains right',
      function() {
        // act
        var actual = compare.diffValue('foobar', 'bar');

        // assert
        expect(actual.left).to.equal('^^^   ');
        expect(actual.right).to.equal('   ');
      });

    it('should add a left hint when the inputs are different and left is longer does not contain right',
      function() {
        // act
        var actual = compare.diffValue('foobar', 'baz');

        // assert
        expect(actual.left).to.equal('^^^^^^');
        expect(actual.right).to.equal('   ');
      });

    it('should add a left hint when the inputs are different and right is longer does not contain left',
      function() {
        // act
        var actual = compare.diffValue('baz', 'foobar');

        // assert
        expect(actual.left).to.equal('   ');
        expect(actual.right).to.equal('^^^^^^');
      });

    it('should add a left hint when the inputs are different and right is longer left in middle',
      function() {
        // act
        var actual = compare.diffValue('faobar', 'ob');

        // assert
        expect(actual.left).to.equal('^^  ^^');
        expect(actual.right).to.equal('  ');
      });

    it('should hint around decimal when only one side has a decimal', function() {
      // act
      var actual = compare.diffValue('24.0', '124');

      // assert
      expect(actual.left).to.equal('   ^');
      expect(actual.right).to.equal('^  ');
    });

    it('should hint around decimal when both sides have a decimal', function() {
      // act
      var actual = compare.diffValue('24.0', '124.0');

      // assert
      expect(actual.left).to.equal('    ');
      expect(actual.right).to.equal('^    ');
    });

    it('should hint around decimal when one side is negative', function() {
      // act
      var actual = compare.diffValue('-224.0', '124.0');

      // assert
      expect(actual.left).to.equal('^^    ');
      expect(actual.right).to.equal('     ');
    });

    it('should hint around decimal and exponent when both sides have a exponent', function() {
      // act
      var actual = compare.diffValue('24.0e+123', '124.0');

      // assert
      expect(actual.left).to.equal('    ^^^^^');
      expect(actual.right).to.equal('^    ');
    });

    it('should hint when one side is NaN', function() {
      // act
      var actual = compare.diffValue('24.0', 'NaN');

      // assert
      expect(actual.left).to.equal('^^^^');
      expect(actual.right).to.equal('   ');
    });

    it('should hint when one side is Infinite', function() {
      // act
      var actual = compare.diffValue('24.0', 'Infinity');

      // assert
      expect(actual.left).to.equal('    ');
      expect(actual.right).to.equal('^^^^^^^^');
    });
  });
});
