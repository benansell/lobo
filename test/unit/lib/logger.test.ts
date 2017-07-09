"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {createLogger, Logger, LoggerImp, LogLevel} from "../../../lib/logger";

let expect = chai.expect;
chai.use(sinonChai);

describe("lib logger", () => {
  let RewiredLogger = rewire("../../../lib/logger");
  let logger: LoggerImp;

  beforeEach(() => {
    let rewiredImp = RewiredLogger.__get__("LoggerImp");
    logger = new rewiredImp();
  });

  describe("createLogger", () => {
    it("should return logger", () => {
      // act
      let actual: Logger = createLogger();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("trace", () => {
    it("should call log with the level 'trace'", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.trace("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Trace, sinon.match.any, sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.trace("foo", "bar");

      // assert
      expect(mockLog.calledWith(sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("debug", () => {
    it("should call log with the level 'debug'", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.debug("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Debug, sinon.match.any, sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.debug("foo", "bar");

      // assert
      expect(mockLog.calledWith(sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("info", () => {
    it("should call log with the level 'info'", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.info("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Info, sinon.match.any, sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.info("foo", "bar");

      // assert
      expect(mockLog.calledWith(sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("warn", () => {
    it("should call log with the level 'warn'", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.warn("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Warn, sinon.match.any, sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.warn("foo", "bar");

      // assert
      expect(mockLog.calledWith(sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("error", () => {
    it("should call log with the level 'error'", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.error("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Error, sinon.match.any, sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      let mockLog = sinon.spy();
      logger.log = mockLog;

      // act
      logger.error("foo", "bar");

      // assert
      expect(mockLog.calledWith(sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("log", () => {
    it("should do nothing when showLogMessage is false", () => {
      // arrange
      let mockShowMassage = sinon.stub();
      mockShowMassage.returns(false);
      logger.showLogMessage = mockShowMassage;

      let mockLevelToLogger = sinon.spy();
      logger.levelToLogger = mockLevelToLogger;

      // act
      logger.log(LogLevel.Trace, "foo", "bar");

      // assert
      expect(mockLevelToLogger).not.to.have.been.called;
    });

    it("should log the message with the level style when there is no data", () => {
      // arrange
      let mockShowMassage = sinon.stub();
      mockShowMassage.returns(true);
      logger.showLogMessage = mockShowMassage;

      let mockLevelToLogger = sinon.stub();
      logger.levelToLogger = mockLevelToLogger;
      let mockLogger = sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      let mockLevelToStyle = sinon.stub();
      mockLevelToStyle.returns(() => {
        return "baz";
      });
      logger.levelToStyle = mockLevelToStyle;

      // act
      logger.log(LogLevel.Trace, "foo");

      // assert
      expect(mockLogger).to.have.been.calledWith("baz");
    });

    it("should log the stringified data with the level style when there is data", () => {
      // arrange
      let mockShowMassage = sinon.stub();
      mockShowMassage.returns(true);
      logger.showLogMessage = mockShowMassage;

      let mockLevelToLogger = sinon.stub();
      logger.levelToLogger = mockLevelToLogger;
      let mockLogger = sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      let mockLevelToStyle = sinon.stub();
      mockLevelToStyle.returns((value: {}) => value);
      logger.levelToStyle = mockLevelToStyle;

      // act
      logger.log(LogLevel.Trace, "foo", {id: 123});

      // assert
      expect(mockLogger).to.have.been.calledWith("foo: ", "{\"id\":123}");
    });

    it("should log instances of error with the level style when there is data", () => {
      // arrange
      let mockShowMassage = sinon.stub();
      mockShowMassage.returns(true);
      logger.showLogMessage = mockShowMassage;

      let mockLevelToLogger = sinon.stub();
      logger.levelToLogger = mockLevelToLogger;
      let mockLogger = sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      let mockLevelToStyle = sinon.stub();
      mockLevelToStyle.returns((value: {}) => value);
      logger.levelToStyle = mockLevelToStyle;
      let error = new Error("foo");

      // act
      logger.log(LogLevel.Trace, "foo", error);

      // assert
      expect(mockLogger).to.have.been.calledWith("foo: ", error.toString());
    });
  });

  describe("showLogMessage", () => {
    it("should throw an error when the log level is unknown", () => {
      expect(() => {
        logger.showLogMessage(<LogLevel>-1);
      }).to.throw("Unknown log level: -1");
    });

    describe("veryVerbose", () => {
      let tests = [{level: LogLevel.Trace, expected: true},
        {level: LogLevel.Debug, expected: true},
        {level: LogLevel.Info, expected: true},
        {level: LogLevel.Warn, expected: true},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          RewiredLogger.__set__({program: {veryVerbose: true}});

          // act
          let actual = logger.showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe("verbose", () => {
      let tests = [{level: LogLevel.Trace, expected: false},
        {level: LogLevel.Debug, expected: true},
        {level: LogLevel.Info, expected: true},
        {level: LogLevel.Warn, expected: true},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          RewiredLogger.__set__({program: {verbose: true}});

          // act
          let actual = logger.showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe("normal", () => {
      let tests = [{level: LogLevel.Trace, expected: false},
        {level: LogLevel.Debug, expected: false},
        {level: LogLevel.Info, expected: true},
        {level: LogLevel.Warn, expected: true},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          RewiredLogger.__set__({program: {normal: true}});

          // act
          let actual = logger.showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe("quiet", () => {
      let tests = [{level: LogLevel.Trace, expected: false},
        {level: LogLevel.Debug, expected: false},
        {level: LogLevel.Info, expected: false},
        {level: LogLevel.Warn, expected: false},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          RewiredLogger.__set__({program: {quiet: true}});

          // act
          let actual = logger.showLogMessage(test.level);

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });
  });

  describe("levelToLogger", () => {
    it("should throw an error when the log level is unknown", () => {
      expect(() => {
        logger.levelToLogger(<LogLevel> -1);
      }).to.throw("Unknown log level: -1");
    });

    let tests = [{level: LogLevel.Trace, expected: console.log},
      {level: LogLevel.Debug, expected: console.log},
      {level: LogLevel.Info, expected: console.info},
      {level: LogLevel.Warn, expected: console.warn},
      {level: LogLevel.Error, expected: console.error}];

    tests.forEach(test => {
      it("should be true when level is '" + test.level + "'", () => {
        // act
        let actual = logger.levelToLogger(test.level);

        // assert
        expect(actual).to.equal(test.expected);
      });
    });
  });

  describe("levelToStyle", () => {
    let revertChalk: () => void;

    beforeEach(() => {
      revertChalk = RewiredLogger.__set__({chalk: {
        dim: { gray: x => "dim gray"},
        gray: x => "gray",
        red: x => "red",
        reset: x => "reset",
        yellow: x => "yellow"
      }});
    });

    afterEach(() => {
      revertChalk();
    });

    it("should throw an error when the log level is unknown", () => {
      expect(() => {
        logger.levelToStyle(<LogLevel> -1);
      }).to.throw("Unknown log level: -1");
    });

    let tests = [{level: LogLevel.Trace, expected: "dim gray"},
      {level: LogLevel.Debug, expected: "gray"},
      {level: LogLevel.Info, expected: "reset"},
      {level: LogLevel.Warn, expected: "yellow"},
      {level: LogLevel.Error, expected: "red"}];

    tests.forEach(test => {
      it("should be true when level is '" + test.level + "'", () => {
        // act
        let actual = logger.levelToStyle(test.level);

        // assert
        expect(actual()).to.equal(test.expected);
      });
    });
  });
});
