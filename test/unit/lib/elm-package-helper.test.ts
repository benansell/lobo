"use strict";

import * as _ from "lodash";
import * as chai from "chai";
import * as path from "path";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createElmPackageHelper, ElmPackageHelper, ElmPackageHelperImp, ElmJson, RawDependencyGroup} from "../../../lib/elm-package-helper";
import {Logger} from "../../../lib/logger";
import {Util} from "../../../lib/util";
import {SinonStub} from "sinon";
import {
  ApplicationDependencies,
  DependencyGroup,
  VersionSpecification,
  VersionSpecificationExact,
  VersionSpecificationInvalid,
  VersionSpecificationRange
} from "../../../lib/plugin";
import {makeVersion} from "../../../lib/version";

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
    mockUtil.resolveDir = Sinon.spy();
    mockUtil.sortObject = (x) => x;
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

  describe("addSourceDirectories", () => {
    it("should return the unaltered source directories when the additions does not exist", () => {
      // arrange
      let expected = ["abc"];

      // act
      let actual = helper.addSourceDirectories("bar", expected, "foo", undefined);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return directories with added additions relative to the test directory when directories are same", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      let actual = helper.addSourceDirectories("bar", ["qux"], "bar", ["foo"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("foo");
    });

    it("should return directories with added additions relative to the test directory when directories are different", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      let actual = helper.addSourceDirectories("baz", ["qux"], "bar", ["foo"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../bar/foo");
    });

    it("should return directories with added additions relative to the test directory when test directory is sub-directory", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      let actual = helper.addSourceDirectories("bar/baz", ["qux"], "bar", ["foo"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../foo");
    });
  });

  describe("convertFromRawDependencies", () => {
    it("should not call convertFromRawDependencyGroup when dependencies is undefined", () => {
      // arrange
      helper.convertFromRawDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies(undefined);

      // assert
      expect(helper.convertFromRawDependencyGroup).not.to.have.been.called;
    });

    it("should call convertFromRawDependencyGroup for direct dependencies", () => {
      // arrange
      const direct = <RawDependencyGroup> {foo: "bar"};
      const indirect = {};
      helper.convertFromRawDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies({direct, indirect});

      // assert
      expect(helper.convertFromRawDependencyGroup).to.have.been.calledWith(direct);
    });

    it("should call convertFromRawDependencyGroup for direct dependencies", () => {
      // arrange
      const direct = {};
      const indirect = <RawDependencyGroup> {foo: "bar"};
      helper.convertFromRawDependencyGroup = Sinon.stub();

      // act
      helper.convertFromRawDependencies({direct, indirect});

      // assert
      expect(helper.convertFromRawDependencyGroup).to.have.been.calledWith(indirect);
    });
  });

  describe("convertFromRawDependencyGroup", () => {
    it("should return empty group when supplied dependencies is undefined", () => {
      // act
      let actual = helper.convertFromRawDependencyGroup(undefined);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should ignore dependencies than are not own", () => {
      // arrange
      const parentDeps = <RawDependencyGroup> {"foo": "bar"};
      const dependencies = Object.create(parentDeps);

      // act
      let actual = helper.convertFromRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should convert to invalid dependency when version is invalid", () => {
      // arrange
      let expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let dependencies = <RawDependencyGroup> {"foo": "bar"};

      // act
      let actual = helper.convertFromRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert to invalid dependency when version is not numeric", () => {
      // arrange
      let expected = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "a.2.3"}};
      let dependencies = <RawDependencyGroup> {"foo": "a.2.3"};

      // act
      let actual = helper.convertFromRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert to application version when version is a single version", () => {
      // arrange
      let expected = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationExact> {type: "application", version: makeVersion(1, 2, 3)}
      };
      let dependencies = <RawDependencyGroup> {"foo": "1.2.3"};

      // act
      let actual = helper.convertFromRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });

    it("should convert dependency to explicit version from min when isApplication is true and version spec is package", () => {
      // arrange
      let expected = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {
          canEqualMax: false,
          canEqualMin: true,
          maxVersion: makeVersion(4, 5, 6),
          minVersion: makeVersion(1, 2, 3),
          type: "package"
        }
      };
      let dependencies = <RawDependencyGroup> {"foo": "1.2.3 <= v < 4.5.6"};

      // act
      let actual = helper.convertFromRawDependencyGroup(dependencies);

      // assert
      expect(actual).to.deep.equal(expected);
    });
  });

  describe("convertToRawDependencies", () => {
    it("should not call convertToRawDependencyGroup when dependencies is undefined", () => {
      // arrange
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(true, undefined);

      // assert
      expect(helper.convertToRawDependencyGroup).not.to.have.been.called;
    });

    it("should call convertToRawDependencyGroup with isApplication", () => {
      // arrange
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(true, {direct: {}, indirect: {}});

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(true, Sinon.match.any);
    });

    it("should call convertToRawDependencyGroup for direct dependencies", () => {
      // arrange
      const direct = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const indirect = {};
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(true, {direct, indirect});

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(Sinon.match.any, direct);
    });

    it("should call convertToRawDependencyGroup for direct dependencies", () => {
      // arrange
      const direct = {};
      const indirect = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      helper.convertToRawDependencyGroup = Sinon.stub();

      // act
      helper.convertToRawDependencies(true, {direct, indirect});

      // assert
      expect(helper.convertToRawDependencyGroup).to.have.been.calledWith(Sinon.match.any, indirect);
    });
  });

  describe("convertToRawDependencyGroup", () => {
    it("should return empty group when supplied dependencies is undefined", () => {
      // act
      let actual = helper.convertToRawDependencyGroup(true, undefined);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should ignore dependencies than are not own", () => {
      // arrange
      const parentDeps = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const dependencies = Object.create(parentDeps);

      // act
      let actual = helper.convertToRawDependencyGroup(true, dependencies);

      // assert
      expect(actual).to.deep.equal({});
    });

    it("should convert dependency to invalid version when isApplication is true and version spec is invalid", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};

      // act
      let actual = helper.convertToRawDependencyGroup(true, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "bar"});
    });

    it("should convert dependency to explicit version when isApplication is true and version spec is application", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationExact> {type: "application", version: makeVersion(1, 2, 3)}
      };

      // act
      let actual = helper.convertToRawDependencyGroup(true, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3"});
    });

    it("should convert dependency to explicit version from min when isApplication is true and version spec is package", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {
          canEqualMax: false,
          canEqualMin: true,
          maxVersion: makeVersion(4, 5, 6),
          minVersion: makeVersion(1, 2, 3),
          type: "package"
        }
      };

      // act
      let actual = helper.convertToRawDependencyGroup(true, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3"});
    });

    it("should convert dependency to invalid version when isApplication is false and version spec is invalid", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};

      // act
      let actual = helper.convertToRawDependencyGroup(false, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "bar"});
    });

    it("should convert dependency to version range with next major version when isApplication is false and version spec is app", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationExact> {type: "application", version: makeVersion(1, 2, 3)}
      };

      // act
      let actual = helper.convertToRawDependencyGroup(false, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3 <= v < 2.0.0"});
    });

    it("should convert dependency to version range equal to min from min when isApplication is false and version spec is package", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {
          canEqualMax: false,
          canEqualMin: true,
          maxVersion: makeVersion(4, 5, 6),
          minVersion: makeVersion(1, 2, 3),
          type: "package"
        }
      };

      // act
      let actual = helper.convertToRawDependencyGroup(false, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3 <= v < 4.5.6"});
    });

    it("should convert dependency to version range equal to max from min when isApplication is false and version spec is package", () => {
      // arrange
      let dependencies = <DependencyGroup<VersionSpecification>> {
        "foo": <VersionSpecificationRange> {
          canEqualMax: true,
          canEqualMin: false,
          maxVersion: makeVersion(4, 5, 6),
          minVersion: makeVersion(1, 2, 3),
          type: "package"
        }
      };

      // act
      let actual = helper.convertToRawDependencyGroup(false, dependencies);

      // assert
      expect(actual).to.deep.equal({foo: "1.2.3 < v <= 4.5.6"});
    });
  });

  describe("isImprovedMinimumConstraint", () => {
    it("should return false when the dependency and the candidate constraints are the same", () => {
      // arrange
      const dependency = <VersionSpecificationRange> {
        canEqualMax: false,
        canEqualMin: true,
        maxVersion: makeVersion(2, 0, 0),
        minVersion: makeVersion(1, 0, 0),
        type: "package"
      };

      const candidate = <VersionSpecificationRange> {
        canEqualMax: false,
        canEqualMin: true,
        maxVersion: makeVersion(2, 0, 0),
        minVersion: makeVersion(1, 0, 0),
        type: "package"
      };

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the dependency is not a valid constraint", () => {
      // arrange
      const dependency = <VersionSpecificationInvalid> {type: "invalid", version: "foo"};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when the candidate is not a valid constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationInvalid> {type: "invalid", version: "foo"};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved major constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(2, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved minor constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 1, 0)};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return false when the candidate is not an improved patch constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 1)};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the candidate is an improved major constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(2, 0, 0)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved minor constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 1, 0)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved patch constraint", () => {
      // arrange
      const dependency = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 0)};
      const candidate = <VersionSpecificationExact> {type: "application", version: makeVersion(1, 0, 1)};

      // act
      let actual = helper.isImprovedMinimumConstraint(dependency, candidate);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("mergeSourceDirectories", () => {
    it("should not add current dir when elm json source dir already contains currrent dir", () => {
      // act
      let actual = helper.mergeSourceDirectories(".lobo", <ElmJson>{sourceDirectories: ["."]}, "sourceDir", [], []);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir only when no other dirs are specified", () => {
      // act
      let actual = helper.mergeSourceDirectories(".lobo", <ElmJson>{}, "sourceDir", ["src"], []);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir only when no other dirs are specified other than the test source directories", () => {
      // act
      let actual = helper
        .mergeSourceDirectories(".lobo", <ElmJson>{}, "sourceDir", ["test"], []);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir relative test directory", () => {
      // arrange
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], []);

      // assert
      expect(actual).to.include(".");
    });

    it("should return array with test directory relative test directory", () => {
      // arrange
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], []);

      // assert
      expect(actual).to.include("test");
    });

    it("should return array with base source directories relative test directory", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], []);

      // assert
      expect(actual).to.include("../sourceDir/src");
    });

    it("should return array with extra directories relative to parent dir", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories("qux", loboPackageJson, "sourceDir", ["src"], ["foo"]);

      // assert
      expect(actual).to.include.something.that.match(/\.\.\/foo$/);
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

    it("should return path ending in elm.json path for supplied directory", () => {
      // act
      let actual = helper.path("/foo/bar");

      // assert
      expect(actual).to.match(/elm\.json$/);
    });
  });

  describe("read", () => {
    it("should be undefined when elm.json does not exist", () => {
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

    it("should return package json with 'dependencies' renamed as 'appDependencies'", () => {
      // arrange
      mockRead.returns(JSON.stringify({dependencies: {direct: {foo: "1.0.0"}}}));
      const expected = {foo: {version: "1.0.0"}};
      helper.convertFromRawDependencyGroup = Sinon.stub().returns(expected);

      // act
      let actual = helper.read("/bar");

      // assert
      expect(actual.srcDependencies.direct).to.equal(expected);
    });

    it("should return package json with 'test-dependencies' renamed as 'testDependencies'", () => {
      // arrange
      mockRead.returns(JSON.stringify({"test-dependencies": {direct: {foo: "1.0.0"}}}));
      const expected = {foo: {version: "1.0.0"}};
      helper.convertFromRawDependencyGroup = Sinon.stub().returns(expected);

      // act
      let actual = helper.read("/bar");

      // assert
      expect(actual.testDependencies.direct).to.equal(expected);
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

  describe("updateSourceDirectories", () => {
    it("should call mergeSourceDirectories with the specified elmJsonDir", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", elmJson, "bar", [], [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
          .to.have.been.calledWith("baz", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified elmJson", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", elmJson, "bar", [], [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, elmJson, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified appDir", () => {
      // arrange
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", elmJson, "bar", [], [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified appSourceDirectories", () => {
      // arrange
      const expected = ["source"];
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", elmJson, "bar", expected, [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified pluginDirectories", () => {
      // arrange
      const expected = ["plugin"];
      const elmJson = <ElmJson>{sourceDirectories: ["test"]};
      const callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("baz", elmJson, "bar", [], expected, callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, expected);
    });

    it("should call supplied callback with the source directory diff", () => {
      // arrange
      let elmJson = <ElmJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.stub();
      const expected = ["foo", "test"];
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(expected);

      // act
      helper.updateSourceDirectories("baz", elmJson, "bar", ["src"], ["foo"], callback);

      // assert
      expect(callback).to.have.been.calledWith(expected, Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateSourceDirectoriesAction with the merged source directories", () => {
      // arrange
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};
      let callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("baz", loboPackageJson, "bar", ["src"], ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(["foo"], Sinon.match.any, Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateSourceDirectoriesAction with the testElmPackageDir", () => {
      // arrange
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};
      let callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("baz", loboPackageJson, "bar", ["src"], ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateSourceDirectoriesAction with the testElmPackage", () => {
      // arrange
      let loboPackageJson = <ElmJson>{sourceDirectories: ["test"]};
      let callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("baz", loboPackageJson, "bar", ["src"], ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, loboPackageJson);
    });
  });

  describe("updateSourceDirectoriesAction", () => {
    it("should update the package json sourceDirectories with the supplied value", () => {
      // arrange
      let expected = ["foo"];
      helper.write = Sinon.stub();

      // act
      let actual = helper.updateSourceDirectoriesAction(expected, "bar", <ElmJson>{});

      // assert
      expect(actual.sourceDirectories).to.equal(expected);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      helper.write = Sinon.spy();

      // act
      helper.updateSourceDirectoriesAction(["foo"], "bar", <ElmJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = ["foo"];
      helper.write = Sinon.spy();

      // act
      helper.updateSourceDirectoriesAction(expected, "bar", <ElmJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith(Sinon.match.any, {sourceDirectories: expected});
    });
  });

  describe("updateDependencies", () => {
    it("should call supplied callback with empty object when there are no missing dependencies", () => {
      // arrange
      let elmJson = <ElmJson>{};
      let callback = Sinon.stub();
      helper.updateDependenciesAction = Sinon.stub();

      // act
      helper.updateDependencies("baz", elmJson, {direct: {}, indirect: {}}, {direct: {}, indirect: {}}, callback);

      // assert
      expect(callback).to.have.been.calledWith({}, Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateDependenciesAction with the merged source directories", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      let loboPackageJson = <ElmJson>{srcDependencies: {direct: {}, indirect: {}}};
      let callback = (diff, updateAction) => updateAction();
      helper.updateDependenciesAction = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateDependencies("baz", loboPackageJson, expected, {direct: {}, indirect: {}}, callback);

      // assert
      expect(helper.updateDependenciesAction)
        .to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });
  });

  describe("updateDependenciesAction", () => {
    it("should update the package json app dependencies with the supplied value", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      helper.write = Sinon.stub();

      // act
      let actual = helper.updateDependenciesAction(expected,  {direct: {}, indirect: {}}, "baz", <ElmJson>{});

      // assert
      expect(actual.srcDependencies).to.deep.equal(expected);
    });

    it("should update the package json test dependencies with the supplied value", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      helper.write = Sinon.stub();

      // act
      let actual = helper.updateDependenciesAction({direct: {}, indirect: {}}, expected, "baz", <ElmJson>{});

      // assert
      expect(actual.testDependencies).to.deep.equal(expected);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      helper.write = Sinon.spy();

      // act
      helper.updateDependenciesAction({direct: {}, indirect: {}}, {direct: {}, indirect: {}}, "baz", <ElmJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should call write with the updated appDependencies", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      helper.write = Sinon.stub();

      // act
      helper.updateDependenciesAction(expected, {direct: {}, indirect: {}}, "baz", <ElmJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith(Sinon.match.any, Sinon.match(value => value.dependencies === expected));
    });

    it("should call write with the updated testDependencies", () => {
      // arrange
      let directDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      helper.write = Sinon.stub();

      // act
      helper.updateDependenciesAction({direct: {}, indirect: {}}, expected, "baz", <ElmJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith(Sinon.match.any, Sinon.match(value => value.testDependencies === expected));
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
      let packageJson = <ElmJson> {sourceDirectories: ["foo"]};
      let expected = `${path.sep}foo${path.sep}bar`;

      // act
      helper.write(expected, packageJson);

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(new RegExp("^" + _.escapeRegExp(expected))), Sinon.match.any);
    });

    it("should write package to 'elm.json'", () => {
      // arrange
      let packageJson = <ElmJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).to.have.been.calledWith(Sinon.match(/\elm\.json$/), Sinon.match.any);
    });

    it("should write package json with 'appDependencies' renamed as 'dependencies'", () => {
      // arrange
      const appDirectDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const appDependencies = <ApplicationDependencies<VersionSpecification>> {direct: appDirectDependencies, indirect: {}};
      const packageJson = <ElmJson> {srcDependencies: appDependencies};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"appDependencies":/));
      expect(mockWrite).to.have.been
        .calledWith(Sinon.match.any, Sinon.match(/"dependencies": {(\r|\n|\s)*"direct": {(\r|\n|\s)*"foo": "bar"/));
    });

    it("should write package json with 'testDependencies' renamed as 'testDependencies'", () => {
      // arrange
      const testDirectDependencies = { "foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      const testDependencies = <ApplicationDependencies<VersionSpecification>> {direct: testDirectDependencies, indirect: {}};
      const packageJson = <ElmJson> {testDependencies};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"testDependencies":/));
      expect(mockWrite).to.have.been
        .calledWith(Sinon.match.any, Sinon.match(/"test-dependencies": {(\r|\n|\s)*"direct": {(\r|\n|\s)*"foo": "bar"/));
    });

    it("should write package json with 'sourceDirectories' renamed as 'source-directories'", () => {
      // arrange
      const packageJson = <ElmJson> {sourceDirectories: ["foo"]};

      // act
      helper.write("/foo", packageJson);

      // assert
      expect(mockWrite).not.to.have.been.calledWith(Sinon.match.any, Sinon.match(/"sourceDirectories":/));
      expect(mockWrite).to.have.been.calledWith(Sinon.match.any, Sinon.match(/"source-directories": \[(\r|\n|\s)*"foo"/));
    });
  });
});
