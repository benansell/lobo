"use strict";

import * as chai from "chai";
import * as path from "path";
import rewire = require("rewire");
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {createElmPackageHelper, ElmPackageHelper, ElmPackageHelperImp, ElmPackageJson} from "../../../lib/elm-package-helper";
import {Logger} from "../../../lib/logger";

let expect = chai.expect;
chai.use(sinonChai);
chai.use(require("chai-things"));

describe("lib elm-package-helper", () => {
  let RewiredHelper = rewire("../../../lib/elm-package-helper");
  let helper: ElmPackageHelperImp;
  let mockLogger: Logger;

  beforeEach(() => {
    let rewiredImp = RewiredHelper.__get__("ElmPackageHelperImp");
    mockLogger = <any> sinon.stub();
    mockLogger.debug = <any> sinon.stub();
    helper = new rewiredImp(mockLogger);
  });

  describe("createElmPackageHelper", () => {
    it("should return elmPackageHelper", () => {
      // act
      let actual: ElmPackageHelper = createElmPackageHelper();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("path", () => {
    it("should return path starting in supplied directory", () => {
      // arrange
      let expected = `${path.sep}foo${path.sep}bar`;

      // act
      let actual = helper.path(expected);

      // assert
      expect(actual).to.match(new RegExp("^" + expected));
    });

    it("should return path ending in elm-package.json path for supplied directory", () => {
      // act
      let actual = helper.path("/foo/bar");

      // assert
      expect(actual).to.match(/elm-package\.json$/);
    });
  });

  describe("read", () => {
    let revertRead: () => void;
    let mockRead;

    beforeEach(() => {
      mockRead = sinon.stub();
      revertRead = RewiredHelper.__set__({fs: {readFileSync: mockRead}})
    });

    afterEach(() => {
      revertRead();
    });

    it("should be undefined when elm-package.json does not exist", () => {
      // act
      let actual = helper.read("/foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return package json when elm-package.json does exists", () => {
      // arrange
      mockRead.returns(JSON.stringify({dependencies: ["foo"]}));

      // act
      let actual = helper.read("/foo");

      // assert
      expect(actual.dependencies.length).to.equal(1);
      expect(actual.dependencies).to.include("foo");
    });

    it("should return package json with 'source-directories' renamed as 'sourceDirectories'", () => {
      // arrange
      mockRead.returns(JSON.stringify({"source-directories": ["foo"]}));

      // act
      let actual = helper.read("/foo");

      // assert
      expect(actual["source-directories"]).not.to.exist;
      expect(actual.sourceDirectories.length).to.equal(1);
      expect(actual.sourceDirectories).to.include("foo");
    });
  });

  describe("write", () => {
    let revertWrite: () => void;
    let mockWrite;

    beforeEach(() => {
      mockWrite = sinon.stub();
      revertWrite = RewiredHelper.__set__({fs: {writeFileSync: mockWrite}})
    });

    afterEach(() => {
      revertWrite();
    });

    it("should write package to supplied directory", () => {
      // arrange
      let packageJson = <ElmPackageJson> {sourceDirectories: ["foo"]};
      let expected = `${path.sep}foo${path.sep}bar`;

      // act
      helper.write(expected, packageJson);

      // assert
      expect(mockWrite).to.have.been.calledWith(sinon.match(new RegExp("^" + expected)), sinon.match.any);
    });

    it("should write package to 'elm-package.json'", () => {
      // arrange
      let packageJson = <ElmPackageJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).to.have.been.calledWith(sinon.match(/\elm-package\.json$/), sinon.match.any);
    });

    it("should write package json with 'sourceDirectories' renamed as 'source-directories'", () => {
      // arrange
      let packageJson = <ElmPackageJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(sinon.match.any, sinon.match(/"sourceDirectories":/));
      expect(mockWrite).to.have.been.calledWith(sinon.match.any, sinon.match(/"source-directories":/));
    });
  });
});
