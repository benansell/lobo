"use strict";

import * as _ from "lodash";
import * as chai from "chai";
import * as path from "path";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createElmPackageHelper, ElmPackageHelper, ElmPackageHelperImp, ElmPackageJson} from "../../../lib/elm-package-helper";
import {Logger} from "../../../lib/logger";
import {Util} from "../../../lib/util";
import {SinonStub} from "sinon";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib elm-package-helper", () => {
  let RewiredHelper = rewire("../../../lib/elm-package-helper");
  let helper: ElmPackageHelperImp;
  let mockLogger: Logger;
  let mockRead: SinonStub;
  let mockUtil: Util;

  beforeEach(() => {
    let rewiredImp = RewiredHelper.__get__("ElmPackageHelperImp");
    mockLogger = <Logger><{}>Sinon.stub();
    mockLogger.debug = Sinon.stub();
    mockRead = Sinon.stub();
    mockUtil = <Util><{}> { read: mockRead };
    helper = new rewiredImp(mockLogger, mockUtil);
  });

  describe("createElmPackageHelper", () => {
    it("should return elmPackageHelper", () => {
      // act
      let actual: ElmPackageHelper = createElmPackageHelper();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("isImprovedMinimumConstraint", () => {
    it("should return false when the dependency and the candidate constraints are the same", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.0.0 <= v < 2.0.0", "1.0.0 <= v < 2.0.0");

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the dependency is not a valid constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("foo", "1.0.0");

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not a valid constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.0.0", "foo");

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved major constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("2.0.0", "1.0.0");

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved minor constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.1.0", "1.0.0");

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved patch constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.0.1", "1.0.0");

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the candidate is an improved major constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.0.0", "2.0.0");

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved minor constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.0.0", "1.1.0");

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved patch constraint", () => {
      // act
      let actual = helper.isImprovedMinimumConstraint("1.0.0", "1.0.1");

      // assert
      expect(actual).to.be.true;
    });
  });


  describe("path", () => {
    it("should return path starting in supplied directory", () => {
      // arrange
      let expected = `${path.sep}foo${path.sep}bar`;

      // act
      let actual = helper.path(expected);

      // assert
      expect(actual).to.match(new RegExp("^" + _.escapeRegExp(expected)));
    });

    it("should return path ending in elm-package.json path for supplied directory", () => {
      // act
      let actual = helper.path("/foo/bar");

      // assert
      expect(actual).to.match(/elm-package\.json$/);
    });
  });

  describe("read", () => {
    it("should be undefined when elm-package.json does not exist", () => {
      // act
      let actual = helper.read("/foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should be undefined when json is invalid", () => {
      // arrange
      mockRead.returns("<xml />");

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
      mockWrite = Sinon.stub();
      revertWrite = RewiredHelper.__set__({fs: {writeFileSync: mockWrite}});
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
      expect(mockWrite).to.have.been.calledWith(Sinon.match(new RegExp("^" + _.escapeRegExp(expected))), Sinon.match.any);
    });

    it("should write package to 'elm-package.json'", () => {
      // arrange
      let packageJson = <ElmPackageJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(/\elm-package\.json$/), Sinon.match.any);
    });

    it("should write package json with 'sourceDirectories' renamed as 'source-directories'", () => {
      // arrange
      let packageJson = <ElmPackageJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"sourceDirectories":/));
      expect(mockWrite).to.have.been.calledWith(Sinon.match.any, Sinon.match(/"source-directories":/));
    });
  });
});
