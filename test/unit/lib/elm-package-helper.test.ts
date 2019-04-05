"use strict";

import * as _ from "lodash";
import * as chai from "chai";
import * as path from "path";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {
  createElmPackageHelper,
  ElmPackageHelper,
  ElmPackageHelperImp,
  ElmJson,
  RawDependencyGroup,
  ElmApplicationJson, ElmPackageJson
} from "../../../lib/elm-package-helper";
import {Logger} from "../../../lib/logger";
import {Util} from "../../../lib/util";
import {SinonStub} from "sinon";
import {
  ApplicationDependencies,
  DependencyGroup, PackageDependencies,
  VersionSpecification,
  VersionSpecificationExact,
  VersionSpecificationInvalid,
  VersionSpecificationRange, VersionSpecificationRangeValid
} from "../../../lib/plugin";
import {makeVersion} from "../../../lib/version";

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib elm-package-helper", () => {
  const RewiredHelper = rewire("../../../lib/elm-package-helper");
  let helper: ElmPackageHelperImp;
  let mockLogger: Logger;
  let mockRead: SinonStub;
  let mockUtil: Util;

  beforeEach(() => {
    const rewiredImp = RewiredHelper.__get__("ElmPackageHelperImp");
    mockLogger = <Logger><{}>Sinon.stub();
    mockLogger.debug = Sinon.stub();
    mockRead = Sinon.stub();
    mockUtil = <Util><{}> { read: mockRead };
    mockUtil.resolveDir = Sinon.spy();
    mockUtil.sortObject = (x) => x;
    helper = new rewiredImp(mockLogger, mockUtil);
  });

  describe("createElmPackageHelper", () => {
    it("should return elmPackageHelper", () => {
      // act
      const actual: ElmPackageHelper = createElmPackageHelper();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("addSourceDirectories", () => {
    it("should return the unaltered source directories when the additions does not exist", () => {
      // arrange
      const expected = ["abc"];

      // act
      const actual = helper.addSourceDirectories("bar", expected, "foo", undefined);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return directories with added additions relative to the test directory when directories are same", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      const actual = helper.addSourceDirectories("bar", ["qux"], "bar", ["foo"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("foo");
    });

    it("should return directories with added additions relative to the test directory when directories are different", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      const actual = helper.addSourceDirectories("baz", ["qux"], "bar", ["foo"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../bar/foo");
    });

    it("should return directories with added additions relative to the test directory when test directory is sub-directory", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      const actual = helper.addSourceDirectories("bar/baz", ["qux"], "bar", ["foo"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../foo");
    });
  });

  describe("clean", () => {
    it("should call read with the supplied loboDir", () => {
      // arrange
      const expected = "/bar/foo.json";
      helper.pathElmJson = Sinon.stub().withArgs("foo").returns(expected);
      helper.tryRead = Sinon.stub();

      // act
      helper.clean("foo");

      // assert
      expect(helper.tryRead).to.have.been.calledWith(expected);
    });

    it("should call write with the elm.json empty sourceDirectories", () => {
      // arrange
      const elmJson = <ElmApplicationJson> {};
      elmJson.sourceDirectories = ["foo", "bar"];
      elmJson.sourceDependencies = {direct: {}, indirect: {}};
      elmJson.testDependencies = {direct: {}, indirect: {}};
      helper.tryRead = Sinon.stub().returns(elmJson);
      let actual = <ElmApplicationJson> {};
      helper.write = Sinon.stub().callsFake((dir, ej) => actual = ej);

      // act
      helper.clean("baz");

      // assert
      expect(actual.sourceDirectories).to.deep.equal([]);
    });

    it("should call write with the elm.json empty sourceDependencies.direct", () => {
      // arrange
      const elmJson = <ElmApplicationJson> {};
      elmJson.sourceDirectories = [];
      elmJson.sourceDependencies = {direct: {foo: {type: "invalid", version: "bar"}}, indirect: {}};
      elmJson.testDependencies = {direct: {}, indirect: {}};
      helper.tryRead = Sinon.stub().returns(elmJson);
      let actual = <ElmApplicationJson> {};
      helper.write = Sinon.stub().callsFake((dir, ej) => actual = ej);

      // act
      helper.clean("baz");

      // assert
      expect(actual.sourceDependencies.direct).to.be.empty;
    });

    it("should call write with the elm.json empty sourceDependencies.indirect", () => {
      // arrange
      const elmJson = <ElmApplicationJson> {};
      elmJson.sourceDirectories = [];
      elmJson.sourceDependencies = {direct: {}, indirect: {foo: {type: "invalid", version: "bar"}}};
      elmJson.testDependencies = {direct: {}, indirect: {}};
      helper.tryRead = Sinon.stub().returns(elmJson);
      let actual = <ElmApplicationJson> {};
      helper.write = Sinon.stub().callsFake((dir, ej) => actual = ej);

      // act
      helper.clean("baz");

      // assert
      expect(actual.sourceDependencies.indirect).to.be.empty;
    });

    it("should call write with the elm.json empty testDependencies.direct", () => {
      // arrange
      const elmJson = <ElmApplicationJson> {};
      elmJson.sourceDirectories = [];
      elmJson.sourceDependencies = {direct: {}, indirect: {}};
      elmJson.testDependencies = {direct: {foo: {type: "invalid", version: "bar"}}, indirect: {}};
      helper.tryRead = Sinon.stub().returns(elmJson);
      let actual = <ElmApplicationJson> {};
      helper.write = Sinon.stub().callsFake((dir, ej) => actual = ej);

      // act
      helper.clean("baz");

      // assert
      expect(actual.testDependencies.direct).to.be.empty;
    });

    it("should call write with the elm.json empty testDependencies.indirect", () => {
      // arrange
      const elmJson = <ElmApplicationJson> {};
      elmJson.sourceDirectories = [];
      elmJson.sourceDependencies = {direct: {}, indirect: {}};
      elmJson.testDependencies = {direct: {}, indirect: {foo: {type: "invalid", version: "bar"}}};
      helper.tryRead = Sinon.stub().returns(elmJson);
      let actual = <ElmApplicationJson> {};
      helper.write = Sinon.stub().callsFake((dir, ej) => actual = ej);

      // act
      helper.clean("baz");

      // assert
      expect(actual.testDependencies.indirect).to.be.empty;
    });
  });

  describe("convertFromRawDependencies", () => {
    it("should not call convertFromRawExactDependencyGroup when dependencies is undefined", () => {
      // arrange
      helper.convertFromRawExactDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies(undefined);

      // assert
      expect(helper.convertFromRawExactDependencyGroup).not.to.have.been.called;
    });

    it("should call convertFromRawExactDependencyGroup for exact direct dependencies", () => {
      // arrange
      const direct = <RawDependencyGroup> {foo: "bar"};
      const indirect = {};
      helper.convertFromRawExactDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies({direct, indirect});

      // assert
      expect(helper.convertFromRawExactDependencyGroup).to.have.been.calledWith(direct);
    });

    it("should call convertFromRawExactDependencyGroup for exact indirect dependencies", () => {
      // arrange
      const direct = {};
      const indirect = <RawDependencyGroup> {foo: "bar"};
      helper.convertFromRawExactDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies({direct, indirect});

      // assert
      expect(helper.convertFromRawExactDependencyGroup).to.have.been.calledWith(indirect);
    });

    it("should not call convertFromRawRangeDependencyGroup when dependencies is undefined", () => {
      // arrange
      helper.convertFromRawRangeDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies(undefined);

      // assert
      expect(helper.convertFromRawRangeDependencyGroup).not.to.have.been.called;
    });

    it("should call convertFromRawRangeDependencyGroup for range dependencies", () => {
      // arrange
      const expected = <RawDependencyGroup> {foo: "bar"};
      helper.convertFromRawRangeDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies(expected);

      // assert
      expect(helper.convertFromRawRangeDependencyGroup).to.have.been.calledWith(expected);
    });
  });

  describe("convertFromRawExactDependencyGroup", () => {
    it("should return empty group when supplied dependencies is undefined", () => {
      // act
      const actual = helper.convertFromRawExactDependencyGroup(undefined);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should ignore dependencies than are not own", () => {
      // arrange
      const parentDeps = <RawDependencyGroup> {"foo": "bar"};
      const dependencies = Object.create(parentDeps);

      // act
      const actual = helper.convertFromRawExactDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should convert to invalid dependency when version is invalid", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const dependencies = <RawDependencyGroup> {"foo": "bar"};

      // act
      const actual = helper.convertFromRawExactDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert to invalid dependency when version is not numeric", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "a.2.3"}};
      const dependencies = <RawDependencyGroup> {"foo": "a.2.3"};

      // act
      const actual = helper.convertFromRawExactDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert to application version when version is a single version", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 2, 3)}
      };
      const dependencies = <RawDependencyGroup> {"foo": "1.2.3"};

      // act
      const actual = helper.convertFromRawExactDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });
  });

  describe("convertFromRawRangeDependencyGroup", () => {
    it("should return empty group when supplied dependencies is undefined", () => {
      // act
      const actual = helper.convertFromRawRangeDependencyGroup(undefined);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should ignore dependencies than are not own", () => {
      // arrange
      const parentDeps = <RawDependencyGroup> {"foo": "bar"};
      const dependencies = Object.create(parentDeps);

      // act
      const actual = helper.convertFromRawRangeDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should convert to invalid dependency when version is invalid", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const dependencies = <RawDependencyGroup> {"foo": "bar"};

      // act
      const actual = helper.convertFromRawRangeDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert to invalid dependency when version is not numeric", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "a.2.3"}};
      const dependencies = <RawDependencyGroup> {"foo": "a.2.3"};

      // act
      const actual = helper.convertFromRawRangeDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert to package version when version is a range version", () => {
      // arrange
      const minVersion = makeVersion(1, 2, 3);
      const maxVersion = makeVersion(4, 5, 6);
      const expected = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {canEqualMin: true, canEqualMax: false, type: "range", maxVersion, minVersion}
      };
      const dependencies = <RawDependencyGroup> {"foo": "1.2.3 <= v < 4.5.6"};

      // act
      const actual = helper.convertFromRawRangeDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });
  });

  describe("convertToAppDependency", () => {
    it("should return supplied value when it is an expect version spec", () => {
      // arrange
      const expected = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 2, 3)};

      // act
      const actual = helper.convertToAppDependency(expected);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return supplied value when it is an invalid version spec", () => {
      // arrange
      const expected = <VersionSpecificationExact> {type: "invalid", version: "foo"};

      // act
      const actual = helper.convertToAppDependency(expected);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return expect version spec when it is a range version spec", () => {
      // arrange
      const minVersion = makeVersion(1, 2, 3);
      const maxVersion = makeVersion(4, 5, 6);
      const range = <VersionSpecificationRangeValid> {canEqualMin: true, canEqualMax: false, type: "range", maxVersion, minVersion};

      // act
      const actual = helper.convertToAppDependency(range);

      // assert
      expect(actual).to.deep.equal({type: "exact", version: range.minVersion});
    });
  });

  describe("convertToRawDependencies", () => {
    it("should not call convertToRawDependencyGroup when dependencies is undefined", () => {
      // arrange
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(undefined);

      // assert
      expect(helper.convertToRawDependencyGroup).not.to.have.been.called;
    });

    it("should call convertToRawDependencyGroup when dependencies is not undefined", () => {
      // arrange
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies({direct: {}, indirect: {}});

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(Sinon.match.any);
    });

    it("should call convertToRawDependencyGroup for direct dependencies", () => {
      // arrange
      const direct = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const indirect = {};
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(<ApplicationDependencies>{direct, indirect});

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(direct);
    });

    it("should call convertToRawDependencyGroup for direct dependencies", () => {
      // arrange
      const direct = {};
      const indirect = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(<ApplicationDependencies>{direct, indirect});

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(indirect);
    });

    it("should call convertToRawDependencyGroup for package dependencies", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(<PackageDependencies> expected);

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(expected);
    });
  });

  describe("convertToRawDependencyGroup", () => {
    it("should return empty group when supplied dependencies is undefined", () => {
      // act
      const actual = helper.convertToRawDependencyGroup( undefined);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should ignore dependencies than are not own", () => {
      // arrange
      const parentDeps = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const dependencies = Object.create(parentDeps);

      // act
      const actual = helper.convertToRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should convert dependency to invalid version when version spec is invalid", () => {
      // arrange
      const dependencies = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};

      // act
      const actual = helper.convertToRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "bar"});
    });

    it("should convert dependency to explicit version when version spec is exact", () => {
      // arrange
      const dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 2, 3)}
      };

      // act
      const actual = helper.convertToRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3"});
    });

    it("should convert dependency to version range equal to min from min when version spec is range", () => {
      // arrange
      const dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {
          canEqualMax: false,
          canEqualMin: true,
          maxVersion: makeVersion(4, 5, 6),
          minVersion: makeVersion(1, 2, 3),
          type: "range"
        }
      };

      // act
      const actual = helper.convertToRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3 <= v < 4.5.6"});
    });

    it("should convert dependency to version range equal to max from min when version spec is range", () => {
      // arrange
      const dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {
          canEqualMax: true,
          canEqualMin: false,
          maxVersion: makeVersion(4, 5, 6),
          minVersion: makeVersion(1, 2, 3),
          type: "range"
        }
      };

      // act
      const actual = helper.convertToRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3 < v <= 4.5.6"});
    });
  });

  describe("findExistingLoboDependencies", () => {
    it("should return empty object when both the source and test dependencies are undefined", () => {
      // arrange
      const elmJson = <ElmApplicationJson> {};

      // act
      const actual = helper.findExistingLoboDependencies(elmJson);

      // assert
      expect(actual).to.be.empty;
    });

    it("should return empty object when both the source and test direct dependencies are undefined", () => {
      // arrange
      const sourceDependencies = <ApplicationDependencies> {direct: undefined, indirect: {}};
      const testDependencies = <ApplicationDependencies> {direct: undefined, indirect: {}};
      const elmJson = <ElmApplicationJson> {sourceDependencies, testDependencies};

      // act
      const actual = helper.findExistingLoboDependencies(elmJson);

      // assert
      expect(actual).to.be.empty;
    });

    it("should return source direct dependencies when only the test dependencies are undefined", () => {
      // arrange
      const sourceDirectDependencies = { "baz": <VersionSpecificationInvalid> {type: "invalid", version: "qux"}};
      const sourceDependencies = <ApplicationDependencies> {direct: sourceDirectDependencies, indirect: {}};
      const elmJson = <ElmApplicationJson> {sourceDependencies, testDependencies: undefined};

      // act
      const actual = helper.findExistingLoboDependencies(elmJson);

      // assert
      expect(actual).to.have.property("baz", sourceDirectDependencies.baz);
    });

    it("should return source direct dependencies when only the test dependencies are undefined", () => {
      // arrange
      const sourceDirectDependencies = { "baz": <VersionSpecificationInvalid> {type: "invalid", version: "qux"}};
      const sourceDependencies = <ApplicationDependencies> {direct: sourceDirectDependencies, indirect: {}};
      const elmJson = <ElmApplicationJson> {sourceDependencies, testDependencies: undefined};

      // act
      const actual = helper.findExistingLoboDependencies(elmJson);

      // assert
      expect(actual).to.have.property("baz", sourceDirectDependencies.baz);
    });

    it("should return test direct dependencies when only the source dependencies are undefined", () => {
      // arrange
      const testDirectDependencies = { "abc": <VersionSpecificationInvalid> {type: "invalid", version: "def"}};
      const testDependencies = <ApplicationDependencies> {direct: testDirectDependencies, indirect: {}};
      const elmJson = <ElmApplicationJson> {sourceDependencies: undefined, testDependencies};

      // act
      const actual = helper.findExistingLoboDependencies(elmJson);

      // assert
      expect(actual).to.have.property("abc", testDirectDependencies.abc);
    });

    it("should return merged source and test direct dependencies", () => {
      // arrange
      const ignoredDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const sourceDirectDependencies = { "baz": <VersionSpecificationInvalid> {type: "invalid", version: "qux"}};
      const sourceDependencies = <ApplicationDependencies> {direct: sourceDirectDependencies, indirect: ignoredDependencies};
      const testDirectDependencies = { "abc": <VersionSpecificationInvalid> {type: "invalid", version: "def"}};
      const testDependencies = <ApplicationDependencies> {direct: testDirectDependencies, indirect: ignoredDependencies};
      const elmJson = <ElmApplicationJson> {sourceDependencies, testDependencies};

      // act
      const actual = helper.findExistingLoboDependencies(elmJson);

      // assert
      expect(actual).to.have.property("baz", sourceDirectDependencies.baz);
      expect(actual).to.have.property("abc", testDirectDependencies.abc);
    });
  });

  describe("findImprovedDependencies", () => {
    it("should return improved dependencies when improved is undefined", () => {
      // arrange
      const current = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(2, 0, 0)}};
      const deps = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      helper.isImprovedMinimumConstraint = Sinon.stub().returns(true);

      // act
      const actual = helper.findImprovedDependencies(current, deps, undefined);

      // assert
      expect(actual).to.deep.equal(deps);
    });

    it("should ignore dependency props that are not own", () => {
      // arrange
      const current = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(2, 0, 0)}};
      const parentDeps = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      const deps = Object.create(parentDeps);
      const improved = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};

      helper.isImprovedMinimumConstraint = Sinon.stub().returns(true);

      // act
      const actual = helper.findImprovedDependencies(current, deps, improved);

      // assert
      expect(actual).to.deep.equal(improved);
    });

    it("should not update supplied improved dependencies when the current minimum constraint is worse", () => {
      // arrange
      const current = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(2, 0, 0)}};
      const deps = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      const improved = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};
      const mockIsImprovedMinimumConstraint = Sinon.stub();
      mockIsImprovedMinimumConstraint.onFirstCall().returns(false);
      helper.isImprovedMinimumConstraint = mockIsImprovedMinimumConstraint;

      // act
      const actual = helper.findImprovedDependencies(current, deps, improved);

      // assert
      expect(actual).to.deep.equal(improved);
    });

    it("should not update supplied improved dependencies when the minimum constraint is better", () => {
      // arrange
      const current = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      const deps = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};
      const improved = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      const mockIsImprovedMinimumConstraint = Sinon.stub();
      mockIsImprovedMinimumConstraint.onFirstCall().returns(true);
      mockIsImprovedMinimumConstraint.onSecondCall().returns(true);
      helper.isImprovedMinimumConstraint = mockIsImprovedMinimumConstraint;

      // act
      const actual = helper.findImprovedDependencies(current, deps, improved);

      // assert
      expect(actual).to.deep.equal(deps);
    });

    it("should return improved dependencies when the minimum constraint is better", () => {
      // arrange
      const current = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      const deps = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};
      const improved = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(3, 0, 0)}};
      helper.isImprovedMinimumConstraint = Sinon.stub().returns(true);

      // act
      const actual = helper.findImprovedDependencies(current, deps, improved);

      // assert
      expect(actual).to.deep.equal(deps);
    });
  });

  describe("findMissingDependencies", () => {
    it("should return empty list when no dependencies are missing", () => {
      // arrange
      const existing = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};
      const deps = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};

      // act
      const actual = helper.findMissingDependencies(existing, deps);

      // assert
      expect(actual).to.be.empty;
    });

    it("should ignore dependencies that are not own", () => {
      // arrange
      const existing = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};
      const parentDeps = {
        bar: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)},
        baz: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}
      };
      const deps = Object.create(parentDeps);
      deps.foo = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};

      // act
      const actual = helper.findMissingDependencies(existing, deps);

      // assert
      expect(actual).to.be.empty;
    });

    it("should return missing dependencies when dependencies are missing", () => {
      // arrange
      const existing = {foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}};
      const deps = {
        bar: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)},
        baz: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)},
        foo: <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)}
      };

      // act
      const actual = helper.findMissingDependencies(existing, deps);

      // assert
      expect(actual).to.deep.equal(["bar", "baz"]);
    });
  });


  describe("isImprovedMinimumConstraint", () => {
    it("should return false when the dependency is empty object", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {};

      const candidate = <VersionSpecificationExact> {
        canEqualMax: false,
        canEqualMin: true,
        type: "exact",
        version: makeVersion(1, 0, 0)
      };

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is empty object", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {
        canEqualMax: false,
        canEqualMin: true,
        type: "exact",
        version: makeVersion(1, 0, 0)
      };

      const candidate = <VersionSpecificationExact> {};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the exact dependency and the candidate constraints are the same", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {
        canEqualMax: false,
        canEqualMin: true,
        type: "exact",
        version: makeVersion(1, 0, 0)
      };

      const candidate = <VersionSpecificationExact> {
        canEqualMax: false,
        canEqualMin: true,
        type: "exact",
        version: makeVersion(1, 0, 0)
      };

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the range dependency and the candidate constraints are the same", () => {
      // arrange
      const dependency = <VersionSpecificationRange> {
        canEqualMax: false,
        canEqualMin: true,
        maxVersion: makeVersion(2, 0, 0),
        minVersion: makeVersion(1, 0, 0),
        type: "range"
      };

      const candidate = <VersionSpecificationRange> {
        canEqualMax: false,
        canEqualMin: true,
        maxVersion: makeVersion(2, 0, 0),
        minVersion: makeVersion(1, 0, 0),
        type: "range"
      };

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the dependency is not a valid constraint", () => {
      // arrange
      const dependency = <VersionSpecificationInvalid> {type: "invalid", version: "foo"};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when the candidate is not a valid constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationInvalid> {type: "invalid", version: "foo"};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved major constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(2, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved minor constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 1, 0)};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved patch constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 1)};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the candidate is an improved major constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(2, 0, 0)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved minor constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 1, 0)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved patch constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "exact", version: makeVersion(1, 0, 1)};

      // act
      const actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("mergeSourceDirectories", () => {
    it("should not add current dir when elm json source dir already contains current dir", () => {
      // act
      const actual = helper.mergeSourceDirectories(".lobo", <ElmApplicationJson>{sourceDirectories: []}, "sourceDir", [], []);

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return array with current dir only when no other dirs are specified", () => {
      // act
      const actual = helper.mergeSourceDirectories(".lobo", <ElmApplicationJson>{}, "sourceDir", ["src"], []);

      // assert
      expect(actual.length).to.equal(1);
    });

    it("should return array with current dir only when no other dirs are specified other than the test source directories", () => {
      // act
      const actual = helper
        .mergeSourceDirectories(".lobo", <ElmApplicationJson>{}, "sourceDir", ["test"], []);

      // assert
      expect(actual.length).to.equal(1);
    });

    it("should return array with test directory relative test directory", () => {
      // arrange
      const loboPackageJson = <ElmApplicationJson>{sourceDirectories: ["test"]};

      // act
      const actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], []);

      // assert
      expect(actual).to.include("test");
    });

    it("should return array with base source directories relative test directory", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();
      const loboPackageJson = <ElmApplicationJson>{sourceDirectories: ["test"]};

      // act
      const actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], []);

      // assert
      expect(actual).to.include("../sourceDir/src");
    });

    it("should return array with extra directories relative to parent dir", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();
      const loboPackageJson = <ElmApplicationJson>{sourceDirectories: ["test"]};

      // act
      const actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], ["foo"]);

      // assert
      expect(actual).to.include.something.that.match(/\.\.\/foo$/);
    });
  });

  describe("pathElmJson", () => {
    it("should return path starting in supplied directory", () => {
      // arrange
      const expected = `${path}foo${path.sep}bar`;
      const mockResolve = Sinon.stub().callsFake((x, y) => x + "/" + y);
      const revertPath = RewiredHelper.__with__({path: {resolve: mockResolve}});

      // act
      let actual: string = "";
      revertPath(() => actual = helper.pathElmJson(expected));

      // assert
      expect(actual).to.match(new RegExp("^" + _.escapeRegExp(expected)));
    });

    it("should return path ending in elm.json path for supplied directory", () => {
      // act
      const actual = helper.pathElmJson("/foo/bar");

      // assert
      expect(actual).to.match(/elm\.json$/);
    });
  });

  describe("pathLoboJson", () => {
    it("should return path starting in supplied directory", () => {
      // arrange
      const expected = `${path.sep}foo${path.sep}bar`;
      const mockResolve = Sinon.stub().callsFake((x, y) => x + "/" + y);
      const revertPath = RewiredHelper.__with__({path: {resolve: mockResolve}});

      // act
      let actual = "";
      revertPath(() => actual = helper.pathLoboJson(expected));

      // assert
      expect(actual).to.match(new RegExp("^" + _.escapeRegExp(expected)));
    });

    it("should return path ending in elm.json path for supplied directory", () => {
      // act
      const actual = helper.pathLoboJson("/foo/bar");

      // assert
      expect(actual).to.match(/lobo\.json$/);
    });
  });

  describe("readLoboElmJson", () => {
    it("should call read with the specified loboDir ", () => {
      // arrange
      const expected = "/bar.json";
      helper.pathElmJson = Sinon.stub().withArgs("foo").returns(expected);
      helper.tryRead = Sinon.stub().returns({});

      // act
      helper.readLoboElmJson("foo");

      // assert
      expect(helper.tryRead).to.have.been.calledWith(expected);
    });

    it("should throw an error when the returned lobo.json is undefined", () => {
      // arrange
      helper.tryRead = Sinon.stub().returns(undefined);

      // act
      try {
        helper.readLoboElmJson("foo");
        expect.fail;
      } catch (err) {
        // assert
        expect(err.toString()).to.match(/Error: Unable to read the .lobo\/elm.json/);
      }
    });
  });

  describe("readLoboJson", () => {
    it("should call read with the specified loboDir ", () => {
      // arrange
      const expected = "/bar.json";
      helper.pathLoboJson = Sinon.stub().withArgs("foo").returns(expected);
      helper.tryRead = Sinon.stub().returns({});

      // act
      helper.readLoboJson("foo");

      // assert
      expect(helper.tryRead).to.have.been.calledWith(expected);
    });

    it("should throw an error when the returned lobo.json is undefined", () => {
      // arrange
      helper.tryRead = Sinon.stub().returns(undefined);

      // act
      try {
        helper.readLoboJson("foo");
        expect.fail;
      } catch (err) {
        // assert
        expect(err.toString()).to.match(/Error: Unable to read the lobo.json/);
      }
    });
  });

  describe("tryRead", () => {
    it("should be undefined when elm.json does not exist", () => {
      // act
      const actual = helper.tryRead("/foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should be undefined when json is invalid", () => {
      // arrange
      mockRead.returns("<xml />");

      // act
      const actual = helper.tryRead("/foo");

      // assert
      expect(actual).to.be.undefined;
    });

    it("should return package json with 'dependencies' renamed as 'sourceDependencies'", () => {
      // arrange
      mockRead.returns(JSON.stringify({dependencies: {direct: {foo: "1.0.0"}}}));
      const expected = {foo: {version: "1.0.0"}};
      const mockConvertFromRawExactDependencyGroup = Sinon.stub();
      helper.convertFromRawExactDependencyGroup = mockConvertFromRawExactDependencyGroup;
      mockConvertFromRawExactDependencyGroup.onCall(0).returns(expected);
      mockConvertFromRawExactDependencyGroup.onCall(1).returns({});

      // act
      const actual = helper.tryRead("/bar");

      // assert
      expect((<ApplicationDependencies>actual.sourceDependencies).direct).to.equal(expected);
    });

    it("should return package json with 'test-dependencies' renamed as 'testDependencies'", () => {
      // arrange
      mockRead.returns(JSON.stringify({"test-dependencies": {direct: {foo: "1.0.0"}}}));
      const expected = {foo: {version: "1.0.0"}};
      helper.convertFromRawExactDependencyGroup = Sinon.stub().returns(expected);

      // act
      const actual = helper.tryRead("/bar");

      // assert
      expect((<ApplicationDependencies>actual.testDependencies).direct).to.equal(expected);
    });

    it("should return package json with empty 'sourceDirectories' when 'source-directories' is missing", () => {
      // arrange
      mockRead.returns(JSON.stringify({type: "application"}));

      // act
      const actual = helper.tryRead<ElmApplicationJson>("/foo");

      // assert
      expect(actual["source-directories"]).not.to.exist;
      expect(actual.sourceDirectories.length).to.equal(0);
    });

    it("should return package json with 'source-directories' renamed as 'sourceDirectories'", () => {
      // arrange
      mockRead.returns(JSON.stringify({"source-directories": ["foo"], type: "application"}));

      // act
      const actual = helper.tryRead<ElmApplicationJson>("/foo");

      // assert
      expect(actual["source-directories"]).not.to.exist;
      expect(actual.sourceDirectories.length).to.equal(1);
      expect(actual.sourceDirectories).to.include("foo");
    });
  });

  describe("tryReadElmJson", () => {
    it("should call read with the specified loboDir ", () => {
      // arrange
      const expected = "/bar.json";
      helper.pathElmJson = Sinon.stub().withArgs("foo").returns(expected);
      helper.tryRead = Sinon.stub().returns({});

      // act
      helper.tryReadElmJson("foo");

      // assert
      expect(helper.tryRead).to.have.been.calledWith(expected);
    });

    it("should return the value returned by tryRead", () => {
      // arrange
      const expected = <ElmJson> {type: "application"};
      helper.pathElmJson = Sinon.stub().returns("bar");
      helper.tryRead = Sinon.stub().returns(expected);

      // act
      const actual = helper.tryReadElmJson("foo");

      // assert
      expect(actual).to.equal(expected);
    });
  });

  describe("updateDependencies", () => {
    it("should call readLoboElmJson with the supplied loboDir", () => {
      // arrange
      const elmJson = <ElmJson>{};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.readLoboElmJson).to.have.been.calledWith("baz");
    });

    it("should call findExistingLoboDependencies with the elm json returned by readLoboElmJson", () => {
      // arrange
      const expected = <ElmJson>{};
      helper.readLoboElmJson = Sinon.stub().returns(expected);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", expected, testDependencies, callback);

      // assert
      expect(helper.findExistingLoboDependencies).to.have.been.calledWith(expected);
    });

    it("should call updateApplicationDependencies for an application json with existingDependencies", () => {
      // arrange
      const elmJson = <ElmJson>{type: "application"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDependencies);
      helper.updateApplicationDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updateApplicationDependencies).to.have.been
        .calledWith(existingDependencies, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateApplicationDependencies for an application json with elm json", () => {
      // arrange
      const elmJson = <ElmJson>{type: "application"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDeps = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDeps);
      helper.updateApplicationDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updateApplicationDependencies).to.have.been
        .calledWith(Sinon.match.any, elmJson, Sinon.match.any, Sinon.match.any);
    });

    it("should call updateApplicationDependencies for an application json with test dependencies", () => {
      // arrange
      const elmJson = <ElmJson>{type: "application"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDeps = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDeps);
      helper.updateApplicationDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updateApplicationDependencies).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, testDependencies, Sinon.match.any);
    });

    it("should call updateApplicationDependencies for an application json with callback", () => {
      // arrange
      const elmJson = <ElmJson>{type: "application"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDeps = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDeps);
      helper.updateApplicationDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updateApplicationDependencies).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, callback);
    });

    it("should call updatePackageDependencies for an application json with existingDependencies", () => {
      // arrange
      const elmJson = <ElmJson>{type: "package"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDependencies);
      helper.updatePackageDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updatePackageDependencies).to.have.been
        .calledWith(existingDependencies, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call updatePackageDependencies for an application json with elm json", () => {
      // arrange
      const elmJson = <ElmJson>{type: "package"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDeps = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDeps);
      helper.updatePackageDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updatePackageDependencies).to.have.been
        .calledWith(Sinon.match.any, elmJson, Sinon.match.any, Sinon.match.any);
    });

    it("should call updatePackageDependencies for an application json with test dependencies", () => {
      // arrange
      const elmJson = <ElmJson>{type: "package"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDeps = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDeps);
      helper.updatePackageDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updatePackageDependencies).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, testDependencies, Sinon.match.any);
    });

    it("should call updatePackageDependencies for an application json with callback", () => {
      // arrange
      const elmJson = <ElmJson>{type: "package"};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const existingDeps = <DependencyGroup<VersionSpecificationRangeValid>> {};
      helper.findExistingLoboDependencies = Sinon.stub().returns(existingDeps);
      helper.updatePackageDependencies = Sinon.stub();
      helper.updatePackageDependencies = Sinon.stub();
      const testDependencies = <DependencyGroup<VersionSpecificationRangeValid>> {};
      const callback = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, testDependencies, callback);

      // assert
      expect(helper.updatePackageDependencies).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, callback);
    });
  });

  describe("updateApplicationDependencies", () => {
    it("should call findMissingDependencies with the supplied appElmJson direct source dependencies", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecificationExact>> {foo: <VersionSpecificationExact> {type: "exact"}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {direct: expected}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();

      helper.findMissingDependencies = Sinon.stub();

      // act
      helper.updateApplicationDependencies(existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findMissingDependencies).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findMissingDependencies with the supplied appElmJson direct test dependencies", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecificationExact>> {foo: <VersionSpecificationExact> {type: "exact"}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {direct: expected}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();

      helper.findMissingDependencies = Sinon.stub();

      // act
      helper.updateApplicationDependencies(existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findMissingDependencies).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findMissingDependencies with the supplied test dependencies", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();

      helper.findMissingDependencies = Sinon.stub();

      // act
      helper.updateApplicationDependencies(existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findMissingDependencies).to.have.been.calledWith(Sinon.match.any, testDeps);
    });

    it("should call the supplied callback with array containing the missing source dependencies", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindMissingDependencies = Sinon.stub();
      mockFindMissingDependencies.onFirstCall().returns(["foo"]);
      helper.findMissingDependencies = mockFindMissingDependencies;

      // act
      helper.updateApplicationDependencies(existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(Sinon.match.array.contains(["foo"]));
    });

    it("should call the supplied callback with array containing the missing appElmJson test dependencies", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindMissingDependencies = Sinon.stub();
      mockFindMissingDependencies.onSecondCall().returns(["foo"]);
      helper.findMissingDependencies = mockFindMissingDependencies;

      // act
      helper.updateApplicationDependencies(existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(Sinon.match.array.contains(["foo"]));
    });

    it("should call the supplied callback with array containing the missing test dependencies", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindMissingDependencies = Sinon.stub();
      mockFindMissingDependencies.onThirdCall().returns(["foo"]);
      helper.findMissingDependencies = mockFindMissingDependencies;

      // act
      helper.updateApplicationDependencies(existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(Sinon.match.array.contains(["foo"]));
    });
  });

  describe("updatePackageDependencies", () => {
    it("should call findMissingDependencies with the supplied packageElmJson source dependencies", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecificationRange>> {foo: <VersionSpecificationRange> {type: "range"}};
      const packageElmJson = <ElmPackageJson>{type: "package", sourceDependencies: expected, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();

      helper.findMissingDependencies = Sinon.stub();

      // act
      helper.updatePackageDependencies(existingDeps, packageElmJson, testDeps, callback);

      // assert
      expect(helper.findMissingDependencies).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findMissingDependencies with the supplied packageElmJson direct test dependencies", () => {
      // arrange
      const expected = <DependencyGroup<VersionSpecificationRange>> {foo: <VersionSpecificationRange> {type: "range"}};
      const packageElmJson = <ElmPackageJson>{type: "package", sourceDependencies: {}, testDependencies: expected};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();

      helper.findMissingDependencies = Sinon.stub();

      // act
      helper.updatePackageDependencies(existingDeps, packageElmJson, testDeps, callback);

      // assert
      expect(helper.findMissingDependencies).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findMissingDependencies with the supplied test dependencies", () => {
      // arrange
      const packageElmJson = <ElmPackageJson>{type: "package", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();

      helper.findMissingDependencies = Sinon.stub();

      // act
      helper.updatePackageDependencies(existingDeps, packageElmJson, testDeps, callback);

      // assert
      expect(helper.findMissingDependencies).to.have.been.calledWith(Sinon.match.any, testDeps);
    });

    it("should call the supplied callback with array containing the missing source dependencies", () => {
      // arrange
      const packageElmJson = <ElmPackageJson>{type: "package", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindMissingDependencies = Sinon.stub();
      mockFindMissingDependencies.onFirstCall().returns(["foo"]);
      helper.findMissingDependencies = mockFindMissingDependencies;

      // act
      helper.updatePackageDependencies(existingDeps, packageElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(Sinon.match.array.contains(["foo"]));
    });

    it("should call the supplied callback with array containing the missing packageElmJson test dependencies", () => {
      // arrange
      const packageElmJson = <ElmPackageJson>{type: "package", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindMissingDependencies = Sinon.stub();
      mockFindMissingDependencies.onSecondCall().returns(["foo"]);
      helper.findMissingDependencies = mockFindMissingDependencies;

      // act
      helper.updatePackageDependencies(existingDeps, packageElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(Sinon.match.array.contains(["foo"]));
    });

    it("should call the supplied callback with array containing the missing test dependencies", () => {
      // arrange
      const packageElmJson = <ElmPackageJson>{type: "package", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindMissingDependencies = Sinon.stub();
      mockFindMissingDependencies.onThirdCall().returns(["foo"]);
      helper.findMissingDependencies = mockFindMissingDependencies;

      // act
      helper.updatePackageDependencies(existingDeps, packageElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(Sinon.match.array.contains(["foo"]));
    });
  });

  describe("updateDependenciesAction", () => {
    it("should ignore improved props that are not own", () => {
      // arrange
      const expected = <ElmApplicationJson>{};
      expected.sourceDependencies = <ApplicationDependencies> {direct: {}, indirect: {}};
      const improvedParent = <DependencyGroup<VersionSpecificationExact>> {foo: <VersionSpecificationExact> {type: "exact"}};
      const improved = Object.create(improvedParent);
      helper.write = Sinon.stub().callsFake((dir, elmJson) => {
        expect(elmJson).to.equal(expected);
        expect(elmJson.sourceDependencies.direct.foo).to.be.undefined;
      });

      // act
      helper.updateDependenciesAction(improved, "baz", expected);

      // assert
      // see setup
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      helper.write = Sinon.spy();

      // act
      helper.updateDependenciesAction({}, "baz", <ElmApplicationJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should call write with the updated appDependencies", () => {
      // arrange
      const improvedDependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationInvalid> {
          type: "invalid",
          version: "bar"
        }
      };
      const expected = <ElmApplicationJson>{};
      expected.sourceDependencies = <ApplicationDependencies> {direct: improvedDependencies, indirect: {}};
      expected.testDependencies = <ApplicationDependencies> {direct: {}, indirect: {}};
      helper.write = Sinon.stub().callsFake((loboDir, actual) => {
        expect(actual).to.deep.equal(expected);
      });
      const loboElmJson = <ElmApplicationJson>{
        sourceDependencies: {direct: {}, indirect: {}},
        testDependencies: {direct: {}, indirect: {}}
      };

      // act
      helper.updateDependenciesAction(improvedDependencies, "baz", loboElmJson);

      // assert
      // see setup
    });
  });

  describe("updateDependencyVersions", () => {
    it("should call readLoboElmJson with the supplied loboDir", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{type: "application"};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.readLoboElmJson = Sinon.stub();
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updateApplicationDependencyVersions = Sinon.stub();

      // act
      helper.updateDependencyVersions("foo", appElmJson, testDeps, callback);

      // assert
      expect(helper.readLoboElmJson).to.have.been.calledWith("foo");
    });

    it("should call findExistingLoboDependencies with the lobo.json returned from readLoboElmJson", () => {
      // arrange
      const expected = <ElmApplicationJson> {sourceDirectories: ["test"]};
      const appElmJson = <ElmApplicationJson>{type: "application"};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.readLoboElmJson = Sinon.stub().returns(expected);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updateApplicationDependencyVersions = Sinon.stub();

      // act
      helper.updateDependencyVersions("foo", appElmJson, testDeps, callback);

      // assert
      expect(helper.findExistingLoboDependencies).to.have.been.calledWith(expected);
    });

    it("should call updateApplicationDependencyVersions with the supplied loboDir", () => {
      // arrange
      const expected = <ElmApplicationJson> {};
      const appElmJson = <ElmApplicationJson>{type: "application"};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.readLoboElmJson = Sinon.stub().returns(expected);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updateApplicationDependencyVersions = Sinon.stub();

      // act
      helper.updateDependencyVersions("foo", appElmJson, testDeps, callback);

      // assert
      expect(helper.updateApplicationDependencyVersions).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call updateApplicationDependencyVersions with the lobo.json returned from readLoboElmJson", () => {
      // arrange
      const expected = <ElmApplicationJson> {sourceDirectories: ["test"]};
      const appElmJson = <ElmApplicationJson>{type: "application"};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.readLoboElmJson = Sinon.stub().returns(expected);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updateApplicationDependencyVersions = Sinon.stub();

      // act
      helper.updateDependencyVersions("foo", appElmJson, testDeps, callback);

      // assert
      expect(helper.updateApplicationDependencyVersions).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call updatePackageDependencyVersions with the supplied loboDir", () => {
      // arrange
      const expected = <ElmPackageJson> {};
      const packageElmJson = <ElmPackageJson>{type: "package"};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.readLoboElmJson = Sinon.stub().returns(expected);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updatePackageDependencyVersions = Sinon.stub();

      // act
      helper.updateDependencyVersions("foo", packageElmJson, testDeps, callback);

      // assert
      expect(helper.updatePackageDependencyVersions).to.have.been.calledWith("foo", Sinon.match.any);
    });

    it("should call updatePackageDependencyVersions with the lobo.json returned from readLoboElmJson", () => {
      // arrange
      const expected = <ElmPackageJson> {type: "package"};
      const packageElmJson = <ElmPackageJson>{type: "package"};
      const testDeps = {foo: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.readLoboElmJson = Sinon.stub().returns(expected);
      helper.findExistingLoboDependencies = Sinon.stub();
      helper.updatePackageDependencyVersions = Sinon.stub();

      // act
      helper.updateDependencyVersions("foo", packageElmJson, testDeps, callback);

      // assert
      expect(helper.updatePackageDependencyVersions).to.have.been.calledWith(Sinon.match.any, expected);
    });
  });

  describe("updateApplicationDependencyVersions", () => {
    it("should call findImprovedDependencies for the supplied existing dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.findImprovedDependencies = Sinon.stub();

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(existingDeps, Sinon.match.any);
    });

    it("should call findImprovedDependencies for the supplied app elm.json direct sourceDependencies", () => {
      // arrange
      const expected = {baz: <VersionSpecificationExact> {type: "exact"}};
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      appElmJson.sourceDependencies.direct = expected;
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.findImprovedDependencies = Sinon.stub();

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findImprovedDependencies for the supplied app elm.json direct testDependencies and improved dependencies", () => {
      // arrange
      const expected = {baz: <VersionSpecificationExact> {type: "exact"}};
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      appElmJson.testDependencies.direct = expected;
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {qux: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onFirstCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(Sinon.match.any, expected, improved);
    });

    it("should call findImprovedDependencies for the supplied test dependencies and improved dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {baz: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onSecondCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(Sinon.match.any, testDeps, improved);
    });

    it("should call the supplied callback with improved dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {baz: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onThirdCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(improved, Sinon.match.any);
    });

    it("should call the supplied callback with a function that calls updateDependenciesAction with improved dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub().callsFake((imp, action) => action());
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {baz: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onThirdCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(improved, Sinon.match.any, Sinon.match.any);
    });

    it("should call the supplied callback with a function that calls updateDependenciesAction with supplied loboDir", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub().callsFake((imp, action) => action());
      helper.findImprovedDependencies = Sinon.stub();
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call the supplied callback with a function that calls updateDependenciesAction with supplied lobo.json", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub().callsFake((imp, action) => action());
      helper.findImprovedDependencies = Sinon.stub();
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updateApplicationDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, loboElmJson);
    });
  });

  describe("updatePackageDependencyVersions", () => {
    it("should call findImprovedDependencies for the supplied existing dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.findImprovedDependencies = Sinon.stub();

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(existingDeps, Sinon.match.any);
    });

    it("should call findImprovedDependencies for the supplied app elm.json sourceDependencies", () => {
      // arrange
      const expected = {baz: <VersionSpecificationRange> {type: "range"}};
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      appElmJson.sourceDependencies = expected;
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      helper.findImprovedDependencies = Sinon.stub();

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(Sinon.match.any, expected);
    });

    it("should call findImprovedDependencies for the supplied app elm.json direct testDependencies and improved dependencies", () => {
      // arrange
      const expected = {baz: <VersionSpecificationRange> {type: "range"}};
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      appElmJson.testDependencies = expected;
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {qux: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onFirstCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(Sinon.match.any, expected, improved);
    });

    it("should call findImprovedDependencies for the supplied test dependencies and improved dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {baz: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onSecondCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.findImprovedDependencies).to.have.been.calledWith(Sinon.match.any, testDeps, improved);
    });

    it("should call the supplied callback with improved dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub();
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {baz: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onThirdCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(callback).to.have.been.calledWith(improved, Sinon.match.any);
    });

    it("should call the supplied callback with a function that calls updateDependenciesAction with improved dependencies", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub().callsFake((imp, action) => action());
      const mockFindImprovedDependencies = Sinon.stub();
      const improved = {baz: <VersionSpecificationExact> {type: "exact"}};
      mockFindImprovedDependencies.onThirdCall().returns(improved);
      helper.findImprovedDependencies = mockFindImprovedDependencies;
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(improved, Sinon.match.any, Sinon.match.any);
    });

    it("should call the supplied callback with a function that calls updateDependenciesAction with supplied loboDir", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub().callsFake((imp, action) => action());
      helper.findImprovedDependencies = Sinon.stub();
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call the supplied callback with a function that calls updateDependenciesAction with supplied lobo.json", () => {
      // arrange
      const loboElmJson = <ElmApplicationJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const appElmJson = <ElmPackageJson>{type: "application", sourceDependencies: {}, testDependencies: {}};
      const existingDeps = {foo: <VersionSpecificationExact> {type: "exact"}};
      const testDeps = {bar: <VersionSpecificationRangeValid> {type: "range"}};
      const callback = Sinon.stub().callsFake((imp, action) => action());
      helper.findImprovedDependencies = Sinon.stub();
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updatePackageDependencyVersions("foo", loboElmJson, existingDeps, appElmJson, testDeps, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, loboElmJson);
    });
  });

  describe("updateSourceDirectories", () => {
    it("should call mergeSourceDirectories with the specified elmJsonDir", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", "bar", [], [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
          .to.have.been.calledWith("baz", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified appDir", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", "bar", [], [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified appSourceDirectories", () => {
      // arrange
      const expected = ["source"];
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", "bar", expected, [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified pluginDirectories", () => {
      // arrange
      const expected = ["plugin"];
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", "bar", [], expected, callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, expected);
    });

    it("should call supplied callback with the source directory diff", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.stub();
      const expected = ["foo", "test"];
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(expected);

      // act
      helper.updateSourceDirectories("baz", "bar", ["src"], ["foo"], callback);

      // assert
      expect(callback).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateSourceDirectoriesAction with the merged source directories", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("baz", "bar", ["src"], ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(["foo"], Sinon.match.any, Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateSourceDirectoriesAction with the testElmPackageDir", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("baz", "bar", ["src"], ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateSourceDirectoriesAction with the testElmPackage", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      helper.readLoboElmJson = Sinon.stub().returns(elmJson);
      const loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};
      const callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("baz", "bar", ["src"], ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, loboPackageJson);
    });
  });

  describe("updateSourceDirectoriesAction", () => {
    it("should update the package json sourceDirectories with the supplied value", () => {
      // arrange
      const expected = ["foo"];
      helper.write = Sinon.stub();

      // act
      const actual = helper.updateSourceDirectoriesAction(expected, "bar", <ElmApplicationJson>{});

      // assert
      expect(actual.sourceDirectories).to.equal(expected);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      helper.write = Sinon.spy();

      // act
      helper.updateSourceDirectoriesAction(["foo"], "bar", <ElmApplicationJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      const expected = ["foo"];
      helper.write = Sinon.spy();

      // act
      helper.updateSourceDirectoriesAction(expected, "bar", <ElmApplicationJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith(Sinon.match.any, {sourceDirectories: expected});
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
      const elmJson = <ElmJson> {sourceDirectories: ["foo"]};
      const expected = `${path.sep}foo${path.sep}bar`;
      const mockResolve = Sinon.stub().callsFake((x, y) => x + "/" + y);
      const revertPath = RewiredHelper.__with__({path: {resolve: mockResolve}});

      // act
      revertPath(() => helper.write(expected, elmJson));

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(new RegExp("^" + _.escapeRegExp(expected))), Sinon.match.any);
    });

    it("should write package to 'elm.json'", () => {
      // arrange
      const elmJson = <ElmJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", elmJson);

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(/\elm\.json$/), Sinon.match.any);
    });

    it("should write package json with 'appDependencies' renamed as 'dependencies'", () => {
      // arrange
      const appDirectDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const appDependencies = <ApplicationDependencies> {direct: appDirectDependencies, indirect: {}};
      const elmJson = <ElmJson> {sourceDependencies: appDependencies};

      // act
      helper.write("/foo", elmJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"appDependencies":/));
      expect(mockWrite).to.have.been
        .calledWith(Sinon.match.any, Sinon.match(/"dependencies": {(\r|\n|\s)*"direct": {(\r|\n|\s)*"foo": "bar"/));
    });

    it("should write package json with 'testDependencies' renamed as 'testDependencies'", () => {
      // arrange
      const testDirectDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const testDependencies = <ApplicationDependencies> {direct: testDirectDependencies, indirect: {}};
      const elmJson = <ElmJson> {testDependencies};

      // act
      helper.write("/foo", elmJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"testDependencies":/));
      expect(mockWrite).to.have.been
        .calledWith(Sinon.match.any, Sinon.match(/"test-dependencies": {(\r|\n|\s)*"direct": {(\r|\n|\s)*"foo": "bar"/));
    });

    it("should write package json with 'sourceDirectories' renamed as 'source-directories'", () => {
      // arrange
      const elmJson = <ElmJson> {sourceDirectories: ["foo"], type: "application"};

      // act
      helper.write("/foo", elmJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"sourceDirectories":/));
      expect(mockWrite).to.have.been.calledWith(Sinon.match.any, Sinon.match(/"source-directories": \[(\r|\n|\s)*"foo"/));
    });
  });
});
