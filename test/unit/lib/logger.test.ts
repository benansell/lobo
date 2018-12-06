"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createLogger, Logger, LoggerImp, LogLevel} from "../../../lib/logger";

const expect = chai.expect;
chai.use(SinonChai);

describe("lib logger", () => {
  const RewiredLogger = rewire("../../../lib/logger");
  let logger: LoggerImp;

  beforeEach(() => {
    const rewiredImp = RewiredLogger.__get__("LoggerImp");
    logger = new rewiredImp();
  });

  describe("createLogger", () => {
    it("should return logger", () => {
      // act
      const actual: Logger = createLogger();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("trace", () => {
    it("should call log with the level 'trace'", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.trace("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Trace, Sinon.match.any, Sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.trace("foo", "bar");

      // assert
      expect(mockLog.calledWith(Sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("debug", () => {
    it("should call log with the level 'debug'", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.debug("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Debug, Sinon.match.any, Sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.debug("foo", "bar");

      // assert
      expect(mockLog.calledWith(Sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("info", () => {
    it("should call log with the level 'info'", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.info("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Info, Sinon.match.any, Sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.info("foo", "bar");

      // assert
      expect(mockLog.calledWith(Sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("warn", () => {
    it("should call log with the level 'warn'", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.warn("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Warn, Sinon.match.any, Sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.warn("foo", "bar");

      // assert
      expect(mockLog.calledWith(Sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("error", () => {
    it("should call log with the level 'error'", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.error("foo", "bar");

      // assert
      expect(mockLog.calledWith(LogLevel.Error, Sinon.match.any, Sinon.match.any)).to.be.true;
    });

    it("should call log with the supplied args", () => {
      // arrange
      const mockLog = Sinon.spy();
      logger.log = mockLog;

      // act
      logger.error("foo", "bar");

      // assert
      expect(mockLog.calledWith(Sinon.match.any, "foo", "bar")).to.be.true;
    });
  });

  describe("log", () => {
    it("should do nothing when showLogMessage is false", () => {
      // arrange
      const mockShowMassage = Sinon.stub();
      mockShowMassage.returns(false);
      logger.showLogMessage = mockShowMassage;

      const mockLevelToLogger = Sinon.spy();
      logger.levelToLogger = mockLevelToLogger;

      // act
      logger.log(LogLevel.Trace, "foo", "bar");

      // assert
      expect(mockLevelToLogger).not.to.have.been.called;
    });

    it("should log the message with the level style when there is no data", () => {
      // arrange
      const mockShowMassage = Sinon.stub();
      mockShowMassage.returns(true);
      logger.showLogMessage = mockShowMassage;

      const mockLevelToLogger = Sinon.stub();
      logger.levelToLogger = mockLevelToLogger;
      const mockLogger = Sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      const mockLevelToStyle = Sinon.stub();
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
      const mockShowMassage = Sinon.stub();
      mockShowMassage.returns(true);
      logger.showLogMessage = mockShowMassage;

      const mockLevelToLogger = Sinon.stub();
      logger.levelToLogger = mockLevelToLogger;
      const mockLogger = Sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      const mockLevelToStyle = Sinon.stub();
      mockLevelToStyle.returns((value: {}) => value);
      logger.levelToStyle = mockLevelToStyle;

      // act
      logger.log(LogLevel.Trace, "foo", {id: 123});

      // assert
      expect(mockLogger).to.have.been.calledWith("foo: ", "{\"id\":123}");
    });

    it("should log instances of error with the level style when there is data", () => {
      // arrange
      const mockShowMassage = Sinon.stub();
      mockShowMassage.returns(true);
      logger.showLogMessage = mockShowMassage;

      const mockLevelToLogger = Sinon.stub();
      logger.levelToLogger = mockLevelToLogger;
      const mockLogger = Sinon.spy();
      mockLevelToLogger.returns(mockLogger);

      const mockLevelToStyle = Sinon.stub();
      mockLevelToStyle.returns((value: {}) => value);
      logger.levelToStyle = mockLevelToStyle;
      const error = new Error("foo");

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
      const tests = [{level: LogLevel.Trace, expected: true},
        {level: LogLevel.Debug, expected: true},
        {level: LogLevel.Info, expected: true},
        {level: LogLevel.Warn, expected: true},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          const revertVeryVerbose = RewiredLogger.__with__({program: {veryVerbose: true}});

          // act
          let actual: boolean = undefined;
          revertVeryVerbose(() => actual = logger.showLogMessage(test.level));

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe("verbose", () => {
      const tests = [{level: LogLevel.Trace, expected: false},
        {level: LogLevel.Debug, expected: true},
        {level: LogLevel.Info, expected: true},
        {level: LogLevel.Warn, expected: true},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          const revertVerbose = RewiredLogger.__with__({program: {verbose: true}});

          // act
          let actual: boolean = undefined;
          revertVerbose(() => actual = logger.showLogMessage(test.level));

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe("normal", () => {
      const tests = [{level: LogLevel.Trace, expected: false},
        {level: LogLevel.Debug, expected: false},
        {level: LogLevel.Info, expected: true},
        {level: LogLevel.Warn, expected: true},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          const revertNormal = RewiredLogger.__with__({program: {normal: true}});

          // act
          let actual: boolean = undefined;
          revertNormal(() => actual = logger.showLogMessage(test.level));

          // assert
          expect(actual).to.equal(test.expected);
        });
      });
    });

    describe("quiet", () => {
      const tests = [{level: LogLevel.Trace, expected: false},
        {level: LogLevel.Debug, expected: false},
        {level: LogLevel.Info, expected: false},
        {level: LogLevel.Warn, expected: false},
        {level: LogLevel.Error, expected: true}];

      tests.forEach(test => {
        it("should be true when level is '" + test.level + "'", () => {
          // arrange
          const revertQuiet = RewiredLogger.__with__({program: {quiet: true}});

          // act
          let actual: boolean = undefined;
          revertQuiet(() => actual = logger.showLogMessage(test.level));

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

    const tests = [{level: LogLevel.Trace, expected: console.log},
      {level: LogLevel.Debug, expected: console.log},

      // tslint:disable-next-line:no-console
      {level: LogLevel.Info, expected: console.info},

      {level: LogLevel.Warn, expected: console.warn},
      {level: LogLevel.Error, expected: console.error}];

    tests.forEach(test => {
      it("should be true when level is '" + test.level + "'", () => {
        // act
        const actual = logger.levelToLogger(test.level);

        // assert
        expect(actual).to.equal(test.expected);
      });
    });
  });

  describe("levelToStyle", () => {
    let revertChalk: () => void;

    beforeEach(() => {
      revertChalk = RewiredLogger.__set__({
        chalk_1: {
          "default": {
            dim: {gray: () => "dim gray"},
            gray: () => "gray",
            red: () => "red",
            reset: () => "reset",
            yellow: () => "yellow"
          }
        }
      });
    });

    afterEach(() => {
      revertChalk();
    });

    it("should throw an error when the log level is unknown", () => {
      expect(() => {
        logger.levelToStyle(<LogLevel> -1);
      }).to.throw("Unknown log level: -1");
    });

    const tests = [{level: LogLevel.Trace, expected: "dim gray"},
      {level: LogLevel.Debug, expected: "gray"},
      {level: LogLevel.Info, expected: "reset"},
      {level: LogLevel.Warn, expected: "yellow"},
      {level: LogLevel.Error, expected: "red"}];

    tests.forEach(test => {
      it("should be true when level is '" + test.level + "'", () => {
        // act
        const actual = logger.levelToStyle(test.level);

        // assert
        expect(actual()).to.equal(test.expected);
      });
    });
  });
});
