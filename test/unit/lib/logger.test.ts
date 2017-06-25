'use strict';

var rewire = require('rewire');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

describe('lib logger', function() {
  describe('trace', function() {
    var logger = rewire('./../../../lib/logger');
    var trace;

    beforeEach(function() {
      trace = logger.__get__('trace');
    });

    it('should call log with the level "trace"', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      trace('foo', 'bar');

      // assert
      expect(mockLog.calledWith('trace', sinon.match.any, sinon.match.any)).to.be.true;
    });

    it('should call log with the supplied args', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      trace('foo', 'bar');

      // assert
      expect(mockLog.calledWith(sinon.match.any, 'foo', 'bar')).to.be.true;
    });
  });

  describe('debug', function() {
    var logger = rewire('./../../../lib/logger');
    var debug;

    beforeEach(function() {
      debug = logger.__get__('debug');
    });

    it('should call log with the level "debug"', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      debug('foo', 'bar');

      // assert
      expect(mockLog.calledWith('debug', sinon.match.any, sinon.match.any)).to.be.true;
    });

    it('should call log with the supplied args', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      debug('foo', 'bar');

      // assert
      expect(mockLog.calledWith(sinon.match.any, 'foo', 'bar')).to.be.true;
    });
  });

  describe('info', function() {
    var logger = rewire('./../../../lib/logger');
    var info;

    beforeEach(function() {
      info = logger.__get__('info');
    });

    it('should call log with the level "info"', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      info('foo', 'bar');

      // assert
      expect(mockLog.calledWith('info', sinon.match.any, sinon.match.any)).to.be.true;
    });

    it('should call log with the supplied args', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      info('foo', 'bar');

      // assert
      expect(mockLog.calledWith(sinon.match.any, 'foo', 'bar')).to.be.true;
    });
  });

  describe('warn', function() {
    var logger = rewire('./../../../lib/logger');
    var warn;

    beforeEach(function() {
      warn = logger.__get__('warn');
    });

    it('should call log with the level "warn"', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      warn('foo', 'bar');

      // assert
      expect(mockLog.calledWith('warn', sinon.match.any, sinon.match.any)).to.be.true;
    });

    it('should call log with the supplied args', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      warn('foo', 'bar');

      // assert
      expect(mockLog.calledWith(sinon.match.any, 'foo', 'bar')).to.be.true;
    });
  });

  describe('error', function() {
    var logger = rewire('./../../../lib/logger');
    var error;

    beforeEach(function() {
      error = logger.__get__('error');
    });

    it('should call log with the level "error"', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      error('foo', 'bar');

      // assert
      expect(mockLog.calledWith('error', sinon.match.any, sinon.match.any)).to.be.true;
    });

    it('should call log with the supplied args', function() {
      // arrange
      var mockLog = sinon.spy();
      logger.__set__('log', mockLog);

      // act
      error('foo', 'bar');

      // assert
      expect(mockLog.calledWith(sinon.match.any, 'foo', 'bar')).to.be.true;
    });
  });

  describe('log', function() {
    var logger = rewire('./../../../lib/logger');
    var log;

    beforeEach(function() {
      log = logger.__get__('log');
    });

    it('should do nothing when showLogMessage is false', function() {
      // arrange
      var mockShowMassage = sinon.stub();
      mockShowMassage.returns(false);
      logger.__set__('showLogMessage', mockShowMassage);

      var mockLevelToLogger = sinon.spy();
      logger.__set__('levelToLogger', mockLevelToLogger);

      // act
      log('trace', 'foo', 'bar');

      // assert
      expect(mockLevelToLogger).not.to.have.been.called;
    });

    it('should log the message with the level style when there is no data', function() {
      // arrange
      var mockShowMassage = sinon.stub();
      mockShowMassage.returns(true);
      logger.__set__('showLogMessage', mockShowMassage);

      var mockLevelToLogger = sinon.stub();
      logger.__set__('levelToLogger', mockLevelToLogger);
      var mockLogger = sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      var mockLevelToStyle = sinon.stub();
      mockLevelToStyle.returns(function() {
        return 'baz';
      });
      logger.__set__('levelToStyle', mockLevelToStyle);

      // act
      log('trace', 'foo');

      // assert
      expect(mockLogger).to.have.been.calledWith('baz');
    });

    it('should log the stringified data with the level style when there is data', function() {
      // arrange
      var mockShowMassage = sinon.stub();
      mockShowMassage.returns(true);
      logger.__set__('showLogMessage', mockShowMassage);

      var mockLevelToLogger = sinon.stub();
      logger.__set__('levelToLogger', mockLevelToLogger);
      var mockLogger = sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      var mockLevelToStyle = sinon.stub();
      mockLevelToStyle.returns(function(value) {
        return value;
      });
      logger.__set__('levelToStyle', mockLevelToStyle);

      // act
      log('trace', 'foo', {id: 123});

      // assert
      expect(mockLogger).to.have.been.calledWith('foo: ', '{"id":123}');
    });

    it('should log instances of error with the level style when there is data', function() {
      // arrange
      var mockShowMassage = sinon.stub();
      mockShowMassage.returns(true);
      logger.__set__('showLogMessage', mockShowMassage);

      var mockLevelToLogger = sinon.stub();
      logger.__set__('levelToLogger', mockLevelToLogger);
      var mockLogger = sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      var mockLevelToStyle = sinon.stub();
      mockLevelToStyle.returns(function(value) {
        return value;
      });
      logger.__set__('levelToStyle', mockLevelToStyle);
      var error = new Error('foo');

      // act
      log('trace', 'foo', error);

      // assert
      expect(mockLogger).to.have.been.calledWith('foo: ', error);
    });
  });

  describe('showLogMessage', function() {
    var logger = rewire('./../../../lib/logger');
    var showLogMessage;

    beforeEach(function() {
      showLogMessage = logger.__get__('showLogMessage');
    });

    it('should throw an error when the log level is unknown', function() {
      expect(function() {
        showLogMessage('foo');
      }).to.throw('Unknown log level: foo');
    });

    describe('veryVerbose', function() {
      var tests = [{level: 'trace', expected: true},
        {level: 'debug', expected: true},
        {level: 'info', expected: true},
        {level: 'warn', expected: true},
        {level: 'error', expected: true}];

      tests.forEach(function(test) {
        it('should be true when level is "' + test.level + '"', function() {
          // arrange
          logger.__set__({program: {veryVerbose: true}});

          // act
          var actual = showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe('verbose', function() {
      var tests = [{level: 'trace', expected: false},
        {level: 'debug', expected: true},
        {level: 'info', expected: true},
        {level: 'warn', expected: true},
        {level: 'error', expected: true}];

      tests.forEach(function(test) {
        it('should be true when level is "' + test.level + '"', function() {
          // arrange
          logger.__set__({program: {verbose: true}});

          // act
          var actual = showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe('normal', function() {
      var tests = [{level: 'trace', expected: false},
        {level: 'debug', expected: false},
        {level: 'info', expected: true},
        {level: 'warn', expected: true},
        {level: 'error', expected: true}];

      tests.forEach(function(test) {
        it('should be true when level is "' + test.level + '"', function() {
          // arrange
          logger.__set__({program: {normal: true}});

          // act
          var actual = showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe('quiet', function() {
      var tests = [{level: 'trace', expected: false},
        {level: 'debug', expected: false},
        {level: 'info', expected: false},
        {level: 'warn', expected: false},
        {level: 'error', expected: true}];

      tests.forEach(function(test) {
        it('should be true when level is "' + test.level + '"', function() {
          // arrange
          logger.__set__({program: {quiet: true}});

          // act
          var actual = showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });
  });

  describe('levelToLogger', function() {
    var logger = rewire('./../../../lib/logger');
    var levelToLogger;

    beforeEach(function() {
      levelToLogger = logger.__get__('levelToLogger');
    });

    it('should throw an error when the log level is unknown', function() {
      expect(function() {
        levelToLogger('foo');
      }).to.throw('Unknown log level: foo');
    });

    var tests = [{level: 'trace', expected: console.log},
      {level: 'debug', expected: console.log},
      {level: 'info', expected: console.info},
      {level: 'warn', expected: console.warn},
      {level: 'error', expected: console.error}];

    tests.forEach(function(test) {
      it('should be true when level is "' + test.level + '"', function() {
        // act
        var actual = levelToLogger(test.level);

        // assert
        expect(actual).to.equal(test.expected);
      });
    });
  });

  describe('levelToStyle', function() {
    var logger = rewire('./../../../lib/logger');
    var levelToStyle;

    beforeEach(function() {
      levelToStyle = logger.__get__('levelToStyle');
    });

    it('should throw an error when the log level is unknown', function() {
      expect(function() {
        levelToStyle('foo');
      }).to.throw('Unknown log level: foo');
    });

    var tests = [{level: 'trace', expected: 'dim'},
      {level: 'debug', expected: 'gray'},
      {level: 'info', expected: 'reset'},
      {level: 'warn', expected: 'yellow'},
      {level: 'error', expected: 'red'}];

    tests.forEach(function(test) {
      it('should be true when level is "' + test.level + '"', function() {
        // act
        var actual = levelToStyle(test.level);

        // assert
        expect(actual._styles[0]).to.equal(test.expected);
      });
    });
  });
});
