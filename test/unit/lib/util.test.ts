"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {UtilImp} from "../../../lib/util";
import {Logger} from "../../../lib/logger";

let expect = chai.expect;
chai.use(sinonChai);

describe("lib util", () => {
  let RewiredUtil = rewire("./../../../lib/util");
  let util: UtilImp;
  let mockLogger: Logger;

  beforeEach(() => {
    let rewiredImp = RewiredUtil.__get__("UtilImp");
    mockLogger = <any> sinon.mock();
    mockLogger.info = <any> sinon.mock();
    mockLogger.error = <any> sinon.mock();
    util = new rewiredImp(mockLogger);
  });

  describe("checkNodeVersion", () => {
    let mockExit;
    let mockLogInfo;
    let mockLogError;
    let processMajor;
    let processMinor;
    let processPatch;

    beforeEach(() => {
      mockExit = sinon.stub(process, "exit");

      let processVersion = process.versions.node.split(".");
      processMajor = parseInt(processVersion[0], 10);
      processMinor = parseInt(processVersion[1], 10);
      processPatch = parseInt(processVersion[2], 10);

      mockLogInfo = sinon.stub(console, "info");
      mockLogError = sinon.stub(console, "error");
    });

    afterEach(() => {
      mockExit.restore();
      mockLogInfo.restore();
      mockLogError.restore();
    });

    it("should throw error when major is not an integer", () => {
      expect(() => {
        util.checkNodeVersion(1.9, 2, 3);
      }).to.throw("major is not an integer");
    });

    it("should throw error when minor is not an integer", () => {
      expect(() => {
        util.checkNodeVersion(1, 2.9, 3);
      }).to.throw("minor is not an integer");
    });

    it("should throw error when patch is not an integer", () => {
      expect(() => {
        util.checkNodeVersion(1, 2, 3.9);
      }).to.throw("patch is not an integer");
    });

    it("should exit the process when major version is too low", () => {
      // act
      util.checkNodeVersion(processMajor + 1, 0, 0);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should exit the process when minor version is too low", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor + 1, 0);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should exit the process when patch version is too low", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch + 1);

      // assert
      expect(mockExit).to.have.been.calledWith(1);
    });

    it("should not exit the process version is at minimum", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch);

      // assert
      expect(mockExit).not.to.have.been.calledWith(1);
    });

    it("should not exit the process version is above minimum", () => {
      // act
      util.checkNodeVersion(processMajor, processMinor, processPatch - 1);

      // assert
      expect(mockExit).not.to.have.been.calledWith(1);
    });
  });
});
