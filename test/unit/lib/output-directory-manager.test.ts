"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {Logger} from "../../../lib/logger";
import {createOutputDirectoryManager, OutputDirectoryManager, OutputDirectoryManagerImp} from "../../../lib/output-directory-manager";
import {LoboConfig} from "../../../lib/plugin";


let expect = chai.expect;
chai.use(SinonChai);

describe("lib output-directory-manager", () => {
  let rewiredMain = rewire("../../../lib/output-directory-manager");
  let rewiredImp;
  let outputDirectoryManager: OutputDirectoryManagerImp;
  let mockLogger: Logger;

  beforeEach(() => {
    rewiredImp = rewiredMain.__get__("OutputDirectoryManagerImp");
    mockLogger = <Logger> {
      debug: Sinon.stub(), error: Sinon.stub(), info: Sinon.stub(),
      trace: Sinon.stub(), warn: Sinon.stub()
    };

    outputDirectoryManager = new rewiredImp(mockLogger);
  });

  describe("createOutputDirectoryManager", () => {
    it("should return main", () => {
      // act
      let actual: OutputDirectoryManager = createOutputDirectoryManager();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("generateBuildOutputFilePath", () => {
    it("should return a file name in the config.LoboDirectory", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "/./.foo"};

      // act
      let actual = outputDirectoryManager.generateBuildOutputFilePath(config);

      // assert
      expect(actual).to.match(/([\/\\])?\.foo([\/\\]).+\.js$/);
    });

    it("should return a file name with 'lobo-test-' prefix", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};

      // act
      let actual = outputDirectoryManager.generateBuildOutputFilePath(config);

      // assert
      expect(actual).to.match(/([\/\\])lobo-test.+\.js$/);
    });

    it("should return a js file name", () => {
      // arrange
      let config = <LoboConfig> {loboDirectory: "foo"};

      // act
      let actual = outputDirectoryManager.generateBuildOutputFilePath(config);

      // assert
      expect(actual).to.match(/.js$/);
    });
  });
});
