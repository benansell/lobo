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
import {Dependencies, PluginTestFrameworkWithConfig} from "../../../lib/plugin";

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
      let actual = helper.addSourceDirectories(undefined, "foo", "bar", expected);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return directories with added additions relative to the test directory when directories are same", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      let actual = helper.addSourceDirectories(["foo"], "bar", "bar", ["qux"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("foo");
    });

    it("should return directories with added additions relative to the test directory when directories are different", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      let actual = helper.addSourceDirectories(["foo"], "bar", "baz", ["qux"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../bar/foo");
    });

    it("should return directories with added additions relative to the test directory when test directory is sub-directory", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();

      // act
      let actual = helper.addSourceDirectories(["foo"], "bar", "bar/baz", ["qux"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../foo");
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

  describe("isNotExistingDependency", () => {
    it("should return false when the candidate exists in the dependencies", () => {
      // act
      let actual = helper.isNotExistingDependency([["foo", "bar"]], ["foo", "bar"]);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the candidate does not exist in the dependencies", () => {
      // act
      let actual = helper.isNotExistingDependency([["foo", "bar"]], ["baz", "qux"]);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the candidate is an improved constraint", () => {
      // arrange
      helper.isImprovedMinimumConstraint = () => true;

      // act
      let actual = helper.isNotExistingDependency([["foo", "1.0.0"]], ["foo", "2.0.0"]);

      // assert
      expect(actual).to.be.true;
    });

    it("should return false when the candidate is not an improved constraint", () => {
      // arrange
      helper.isImprovedMinimumConstraint = () => false;

      // act
      let actual = helper.isNotExistingDependency([["foo", "2.0.0"]], ["foo", "1.0.0"]);

      // assert
      expect(actual).to.be.false;
    });
  });

  describe("mergeDependencies", () => {
    it("should return empty dependency list when source, test and framework dependencies do not exist", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{};
      let testPackageJson = <ElmPackageJson>{};
      let testFramework = <PluginTestFrameworkWithConfig> {config: {}};

      // act
      let actual = helper.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return the source and test framework dependencies when the test dependencies does not exist", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "foo"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> undefined};
      let testFramework = <PluginTestFrameworkWithConfig> {config: {dependencies: <Dependencies> {framework: "baz"}}};

      // act
      let actual = helper.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

      // assert
      expect(actual.length).to.equal(2);
      expect(actual).to.include.something.deep.equal(["source", "foo"]);
      expect(actual).to.include.something.deep.equal(["framework", "baz"]);
    });

    it("should return the source test and test framework dependencies for the supplied parameters", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "foo"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "bar"}};
      let testFramework = <PluginTestFrameworkWithConfig> {config: {dependencies: <Dependencies> {framework: "baz"}}};

      // act
      let actual = helper.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

      // assert
      expect(actual.length).to.equal(3);
      expect(actual).to.include.something.deep.equal(["source", "foo"]);
      expect(actual).to.include.something.deep.equal(["framework", "baz"]);
    });

    it("should return the source test and test framework without duplicates", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {foo: "bar"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {foo: "bar"}};
      let testFramework = <PluginTestFrameworkWithConfig> {config: {dependencies: <Dependencies> {foo: "bar"}}};

      // act
      let actual = helper.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include.something.deep.equal(["foo", "bar"]);
    });
  });

  describe("mergeSourceDirectories", () => {
    it("should return array with current dir only when no other dirs are specified", () => {
      // act
      let actual = helper.mergeSourceDirectories(<ElmPackageJson>{}, "sourceDir", <ElmPackageJson>{}, ".", []);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir only when no other dirs are specified other than the test source directories", () => {
      // act
      let actual = helper
        .mergeSourceDirectories(<ElmPackageJson>{}, "sourceDir", <ElmPackageJson>{sourceDirectories: ["."]}, ".", []);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir relative test directory", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "qux", []);

      // assert
      expect(actual).to.include(".");
    });

    it("should return array with test directory relative test directory", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "qux", []);

      // assert
      expect(actual).to.include("test");
    });

    it("should return array with base source directories relative test directory", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = helper.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "qux", []);

      // assert
      expect(actual).to.include("../sourceDir/source");
    });

    it("should return array with extra directories relative to parent dir", () => {
      // arrange
      mockUtil.resolveDir = (...dirs) => dirs.join();
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let extraDir = ["foo"];

      // act
      let actual = helper.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "qux", extraDir);

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

  describe("updateSourceDirectories", () => {
    it("should call mergeSourceDirectories with the specified base package json", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
          .to.have.been.calledWith(sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified base directory", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories( "bar", sourcePackageJson, "baz", testPackageJson, [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified test package json", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified main test directory", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, [], callback);

      // assert
      expect(helper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified extraDirectories", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.spy();

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"], callback);

      // assert
      expect(helper.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, ["foo"]);
    });

    it("should call supplied callback with the source directory diff", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = Sinon.stub();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo", "test"]);

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"], callback);

      // assert
      expect(callback)
        .to.have.been.calledWith(["foo"], Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateDependenciesAction with the merged source directories", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(["foo"], Sinon.match.any, Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateDependenciesAction with the testElmPackageDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call supplied callback with a function that calls updateDependenciesAction with the testElmPackage", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let callback = (diff, updateAction) => updateAction();
      helper.updateSourceDirectoriesAction = Sinon.spy();
      helper.mergeSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeSourceDirectories).returns(["foo"]);

      // act
      helper.updateSourceDirectories("bar", sourcePackageJson, "baz", testPackageJson, ["foo"], callback);

      // assert
      expect(helper.updateSourceDirectoriesAction)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, testPackageJson);
    });
  });

  describe("updateSourceDirectoriesAction", () => {
    it("should update the package json sourceDirectories with the supplied value", () => {
      // arrange
      let expected = ["foo"];
      helper.write = Sinon.stub();

      // act
      let actual = helper.updateSourceDirectoriesAction(expected, "bar", <ElmPackageJson>{});

      // assert
      expect(actual.sourceDirectories).to.equal(expected);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      helper.write = Sinon.spy();

      // act
      helper.updateSourceDirectoriesAction(["foo"], "bar", <ElmPackageJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = ["foo"];
      helper.write = Sinon.spy();

      // act
      helper.updateSourceDirectoriesAction(expected, "bar", <ElmPackageJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith(Sinon.match.any, {sourceDirectories: expected});
    });
  });

  describe("updateDependencies", () => {
    it("should call mergeDependencies with the specified base package json", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = Sinon.stub();
      helper.mergeDependencies = Sinon.spy();

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(helper.mergeDependencies)
          .to.have.been.calledWith(sourcePackageJson, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeDependencies with the specified test package json", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = Sinon.stub();
      helper.mergeDependencies = Sinon.spy();

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(helper.mergeDependencies)
          .to.have.been.calledWith(Sinon.match.any, testPackageJson, Sinon.match.any);
    });

    it("should call mergeDependencies with the specified testFramework", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = Sinon.stub();
      helper.mergeDependencies = Sinon.spy();

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(helper.mergeDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, testFramework);
    });

    it("should call supplied callback with the dependency diff", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = Sinon.stub();
      helper.mergeDependencies = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeDependencies).returns(["foo"]);

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(callback).to.have.been.calledWith(["foo"], Sinon.match.any);
    });

    it("should call supplied callback with an update action that calls updateDependenciesAction with the merged dependencies", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = (diff, updateAction) => updateAction();
      helper.updateDependenciesAction = Sinon.spy();
      helper.mergeDependencies = Sinon.stub();
      (<Sinon.SinonStub>helper.mergeDependencies).returns(["foo"]);

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith(["foo"], Sinon.match.any, Sinon.match.any);
    });

    it("should call supplied callback with an update action that calls updateDependenciesAction with the testElmPackageDir", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = (diff, updateAction) => updateAction();
      helper.updateDependenciesAction = Sinon.spy();
      helper.mergeDependencies = Sinon.stub();

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith( Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call supplied callback with an update action that calls updateDependenciesAction with the testElmPackage", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let callback = (diff, updateAction) => updateAction();
      helper.updateDependenciesAction = Sinon.spy();
      helper.mergeDependencies = Sinon.stub();

      // act
      helper.updateDependencies(testFramework, sourcePackageJson, "baz", testPackageJson, callback);

      // assert
      expect(helper.updateDependenciesAction).to.have.been.calledWith( Sinon.match.any, Sinon.match.any, testPackageJson);
    });
  });

  describe("updateDependenciesAction", () => {
    it("should update the package json dependencies with the supplied value", () => {
      // arrange
      let expected = [["foo", "bar"]];
      helper.write = Sinon.stub();

      // act
      let actual = helper.updateDependenciesAction(expected, "baz", <ElmPackageJson>{});

      // assert
      expect(actual.dependencies).to.deep.equal({foo: "bar"});
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      helper.write = Sinon.spy();

      // act
      helper.updateDependenciesAction([["foo", "bar"]], "baz", <ElmPackageJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = [["foo", "baz"]];
      helper.write = Sinon.spy();

      // act
      helper.updateDependenciesAction(expected, "baz", <ElmPackageJson>{});

      // assert
      expect(helper.write).to.have.been.calledWith(Sinon.match.any, Sinon.match(value => value.dependencies.foo = "bar"));
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
