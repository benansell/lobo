"use strict";

import * as chai from "chai";
import {makeVersion, VersionImp} from "../../../lib/version";
import {Version} from "../../../lib/plugin";

const expect = chai.expect;

describe("lib version", () => {
  describe("makeVersion", () => {
    it("should return version with the specified major version", () => {
      // act
      const actual: Version = makeVersion(1, 2, 3);

      // assert
      expect(actual.major).to.equal(1);
    });

    it("should return version with the specified minor version", () => {
      // act
      const actual: Version = makeVersion(1, 2, 3);

      // assert
      expect(actual.minor).to.equal(2);
    });

    it("should return version with the specified patch version", () => {
      // act
      const actual: Version = makeVersion(1, 2, 3);

      // assert
      expect(actual.patch).to.equal(3);
    });
  });

  describe("isEqual", () => {
    it("should return false when supplied value is false", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isEqual(undefined);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value major versions are different", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isEqual(new VersionImp(9, 2, 3));

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value minor versions are different", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isEqual(new VersionImp(1, 9, 3));

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value patch versions are different", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isEqual(new VersionImp(1, 2, 9));

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when supplied value is equal", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isEqual(new VersionImp(1, 2, 3));

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isGreaterThan", () => {
    it("should return false when supplied value is false", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(undefined);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value major version is bigger", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(9, 2, 3));

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when supplied value major version is smaller", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(0, 2, 3));

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when supplied value minor version is bigger", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(1, 9, 3));

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value minor version is smaller", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(1, 0, 3));

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when supplied value patch version is bigger", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(1, 2, 9));

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value patch version is smaller", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(1, 2, 0));

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when supplied value is equal", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isGreaterThan(new VersionImp(1, 2, 3));

      // assert
      expect(actual).to.be.false;
    });
  });

  describe("isLessThan", () => {
    it("should return false when supplied value is false", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(undefined);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value major version is smaller", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(0, 2, 3));

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when supplied value major version is bigger", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(9, 2, 3));

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when supplied value minor version is smaller", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(1, 0, 3));

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value minor version is bigger", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(1, 9, 3));

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when supplied value patch version is smaller", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(1, 2, 0));

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when supplied value patch version is bigger", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(1, 2, 9));

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when supplied value is equal", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.isLessThan(new VersionImp(1, 2, 3));

      // assert
      expect(actual).to.be.false;
    });
  });

  describe("toString", () => {
    it("should return version in format 'x.y.z'", () => {
      // arrange
      const version = new VersionImp(1, 2, 3);

      // act
      const actual = version.toString();

      // assert
      expect(actual).to.equal("1.2.3");
    });
  });
});
