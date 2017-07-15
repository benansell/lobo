"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import {SinonStub} from "sinon";
import * as SinonChai from "sinon-chai";
import {Builder, BuilderImp, createBuilder} from "../../../lib/builder";
import {Dependencies, LoboConfig, PluginTestFrameworkWithConfig} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";
import {ElmPackageHelper, ElmPackageJson} from "../../../lib/elm-package-helper";
import * as Bluebird from "bluebird";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib builder", () => {
  let RewiredBuilder = rewire("../../../lib/builder");
  let builder: BuilderImp;
  let mockConfirm: SinonStub;
  let mockHelper: ElmPackageHelper;
  let mockLogger: Logger;
  let mockReject: any;
  let mockResolve: any;
  let revertPrompt: () => void;

  beforeEach(() => {
    mockConfirm = Sinon.stub();
    revertPrompt = RewiredBuilder.__set__({promptly: {confirm: mockConfirm}});
    let rewiredImp = RewiredBuilder.__get__("BuilderImp");
    mockLogger = <Logger> {};
    mockLogger.debug = <any> Sinon.spy();
    mockLogger.error = <any> Sinon.spy();
    mockLogger.info = <any> Sinon.spy();
    mockLogger.trace = <any> Sinon.spy();
    mockHelper = <ElmPackageHelper> {path: x => x, read: Sinon.stub(), write: Sinon.stub()};
    builder = new rewiredImp(mockHelper, mockLogger);

    mockReject = <any> Sinon.spy();
    mockResolve = <any> Sinon.spy();
  });

  afterEach(() => {
    revertPrompt();
  });

  describe("createBuilder", () => {
    it("should return builder", () => {
      // act
      let actual: Builder = createBuilder();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("build", () => {
    it("should not call ensureElmPackageExists when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: true};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.stub();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.ensureElmPackageExists).not.to.have.been.called;
      });
    });

    it("should not call syncTestElmPackage when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: true};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.stub();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.syncTestElmPackage).not.to.have.been.called;
      });
    });

    it("should call installDependencies when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: true};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.stub();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.installDependencies).to.have.been.called;
      });
    });

    it("should call make when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: true};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.stub();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.make).to.have.been.called;
      });
    });

    it("should call ensureElmPackageExists with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.stub();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.ensureElmPackageExists).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call ensureElmPackageExists with the base directory of '.' and location 'current'", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.stub();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.ensureElmPackageExists).to.have.been.calledWith(Sinon.match.any, ".", "current");
      });
    });

    it("should call ensureElmPackageExists with the supplied test directory and location of 'test", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.ensureElmPackageExists).to.have.been.calledWith(Sinon.match.any, "bar", "tests");
      });
    });

    it("should call syncTestElmPackage with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.syncTestElmPackage).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call syncTestElmPackage with a base directory of '.'", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.syncTestElmPackage).to.have.been.calledWith(Sinon.match.any, ".", Sinon.match.any);
      });
    });

    it("should call syncTestElmPackage with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.syncTestElmPackage).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "bar");
      });
    });

    it("should call installDependencies with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.installDependencies).to.have.been.calledWith(config, Sinon.match.any);
      });
    });

    it("should call installDependencies with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.installDependencies).to.have.been.calledWith(Sinon.match.any, "bar");
      });
    });

    it("should call make with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.make).to.have.been.calledWith(config, Sinon.match.any);
      });
    });

    it("should call make with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", noUpdate: false};
      builder.ensureElmPackageExists = Sinon.stub();
      builder.syncTestElmPackage = Sinon.stub();
      builder.installDependencies = Sinon.stub();
      builder.make = Sinon.spy();

      // act
      let actual = builder.build(config, "bar");

      // assert
      actual.then(() => {
        expect(builder.make).to.have.been.calledWith(Sinon.match.any, "bar");
      });
    });
  });

  describe("ensureElmPackageExists", () => {
    it("should do nothing when elm-package.json already exists", () => {
      // arrange
      let revert = RewiredBuilder.__with__({shelljs: {test: x => true}});
      let config = <LoboConfig> {testFile: "foo", prompt: false};

      // act
      let actual: Bluebird<object> = undefined;
      revert(() => actual = builder.ensureElmPackageExists(config, "foo", "bar"));

      // assert
      expect(actual.isResolved()).to.be.true;
    });

    it("should not prompt the user before running elm package install when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: false};
      builder.runElmPackageInstall = Sinon.spy();

      // act
      builder.ensureElmPackageExists(config, "foo", "bar");

      // assert
      expect(mockConfirm).not.to.have.been.called;
      expect(builder.runElmPackageInstall).to.have.been.calledWith();
    });

    it("should prompt the user before running elm package install when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.runElmPackageInstall = Sinon.spy();

      // act
      builder.ensureElmPackageExists(config, "foo", "bar");

      // assert
      expect(mockConfirm).to.have.been.called;
      expect(builder.runElmPackageInstall).not.to.have.been.called;
    });

    it("should not call runElmPackageInstall when config.prompt is true and error occurs", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.runElmPackageInstall = Sinon.spy();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

      // act
      let actual = builder.ensureElmPackageExists(config, "foo", "bar");
      actual.catchReturn({});

      // assert
      expect(builder.runElmPackageInstall).not.to.have.been.called;
    });

    it("should not call runElmPackageInstall when config.prompt is true and user answers false", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.runElmPackageInstall = Sinon.spy();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

      // act
      let actual = builder.ensureElmPackageExists(config, "foo", "bar");
      actual.catchReturn({});

      // assert
      expect(builder.runElmPackageInstall).not.to.have.been.called;
    });

    it("should call runElmPackageInstall with prompt false when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: false};
      builder.runElmPackageInstall = Sinon.spy();

      // act
      builder.ensureElmPackageExists(config, "foo", "bar");

      // assert
      expect(builder.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, false, Sinon.match.any, Sinon.match.any);
    });

    it("should call runElmPackageInstall with prompt true when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.runElmPackageInstall = Sinon.spy();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      builder.ensureElmPackageExists(config, "foo", "bar");

      // assert
      expect(builder.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true, Sinon.match.any, Sinon.match.any);
    });
  });

  describe("syncTestElmPackage", () => {
    it("should call readElmPackage with the supplied base package directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.readElmPackage).to.have.been.calledWith("bar", Sinon.match.any);
      });
    });

    it("should call readElmPackage with the supplied test package directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.readElmPackage).to.have.been.calledWith(Sinon.match.any, "baz");
      });
    });

    it("should call updateSourceDirectories with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateSourceDirectories).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the supplied base package directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the result.base from readElmPackage", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "abc", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "abc", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the supplied test package directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the result.test from readElmPackage", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "abc"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, "abc");
      });
    });

    it("should call updateDependencies with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateDependencies).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateDependencies with the result.base from updateSourceDirectories", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "abc", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateDependencies).to.have.been.calledWith(Sinon.match.any, "abc", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateDependencies with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "abc", test: "b"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateDependencies).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should call updateDependencies with the result.test from updateSourceDirectories", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      builder.readElmPackage = Sinon.stub();
      (<SinonStub>builder.readElmPackage).resolves({base: "a", test: "b"});
      builder.updateSourceDirectories = Sinon.stub();
      (<SinonStub>builder.updateSourceDirectories).resolves({base: "a", test: "abc"});
      builder.updateDependencies = Sinon.stub();
      (<SinonStub>builder.updateDependencies).resolves({});

      // act
      let actual = builder.syncTestElmPackage(config, "bar", "baz");

      // assert
      actual.then(() => {
        expect(builder.updateDependencies).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "abc");
      });
    });
  });

  describe("readElmPackage", () => {
    it("should log an error when unable to read the source elm-package.json from the supplied base directory", () => {
      // arrange
      (<SinonStub>mockHelper.read).onSecondCall().returns({});

      // act
      let actual = builder.readElmPackage("foo", "bar");
      actual.catchReturn({});

      // assert
      expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/main elm-package.json/));
    });

    it("should log an error when unable to read the test elm-package.json from the supplied test directory", () => {
      // arrange
      (<SinonStub>mockHelper.read).onFirstCall().returns({});

      // act
      let actual = builder.readElmPackage("foo", "bar");
      actual.catchReturn({});

      // assert
      expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/test elm-package.json/));
    });

    it("should read the source elm-package.json from the supplied base directory", () => {
      // arrange
      (<SinonStub>mockHelper.read).returns({});

      // act
      builder.readElmPackage("foo", "bar");

      // assert
      expect(mockHelper.read).to.have.been.calledWith("foo");
    });

    it("should read the test elm-package.json from the supplied test directory", () => {
      // arrange
      (<SinonStub>mockHelper.read).returns({});

      // act
      builder.readElmPackage("foo", "bar");

      // assert
      expect(mockHelper.read).to.have.been.calledWith("bar");
    });

    it("should return the base json values", () => {
      // arrange
      let expectedSource = {name: "source"};
      let expectedTest = {name: "test"};
      (<SinonStub>mockHelper.read).onFirstCall().returns(expectedSource);
      (<SinonStub>mockHelper.read).onSecondCall().returns(expectedTest);

      // act
      let actual = builder.readElmPackage("foo", "bar");

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(expectedSource);
      });
    });

    it("should return the test json values", () => {
      // arrange
      let expectedSource = {name: "source"};
      let expectedTest = {name: "test"};
      (<SinonStub>mockHelper.read).onFirstCall().returns(expectedSource);
      (<SinonStub>mockHelper.read).onSecondCall().returns(expectedTest);

      // act
      let actual = builder.readElmPackage("foo", "bar");

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expectedTest);
      });
    });
  });

  describe("updateSourceDirectories", () => {
    it("should call mergeSourceDirectories with the specified base package json", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeSourceDirectories)
        .to.have.been.calledWith(sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified base directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified test package json", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified test directory", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
    });

    it("should call mergeSourceDirectories with the specified testFramework", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeSourceDirectories)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, config.testFramework);
    });

    it("should return the unaltered base package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();
      (<SinonStub>builder.mergeSourceDirectories).returns(testPackageJson.sourceDirectories);

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the unaltered test package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.mergeSourceDirectories = Sinon.stub();
      (<SinonStub>builder.mergeSourceDirectories).returns(testPackageJson.sourceDirectories);

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(testPackageJson);
      });
    });

    it("should not prompt the user before running updating source directories when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockConfirm).not.to.have.been.called;
      expect(builder.updateSourceDirectoriesAction).to.have.been.calledWith();
    });

    it("should prompt the user before running updating source directories when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockConfirm).to.have.been.called;
      expect(builder.updateSourceDirectoriesAction).not.to.have.been.called;
    });

    it("should not call updateSourceDirectoriesAction when config.prompt is true and error occurs", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);
      actual.catchReturn({});

      // assert
      expect(builder.updateSourceDirectoriesAction).not.to.have.been.called;
    });

    it("should not call updateSourceDirectoriesAction when config.prompt is true and user answers false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);
      actual.catchReturn({});

      // assert
      expect(builder.updateSourceDirectoriesAction).not.to.have.been.called;
    });

    it("should call updateSourceDirectoriesAction with merged sourceDirectories when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      builder.mergeSourceDirectories = Sinon.stub();
      let expected = ["foo", "bar"];
      (<SinonStub>builder.mergeSourceDirectories).returns(expected);

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.updateSourceDirectoriesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      let expected = <ElmPackageJson> {sourceDirectories: ["foo", "bar"]};
      (<SinonStub>builder.updateSourceDirectoriesAction).returns(expected);

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });

    it("should call updateSourceDirectoriesAction with merged sourceDirectories when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      builder.mergeSourceDirectories = Sinon.stub();
      let expected = ["foo", "bar"];
      (<SinonStub>builder.mergeSourceDirectories).returns(expected);

      // act
      builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.updateSourceDirectoriesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      builder.updateSourceDirectoriesAction = Sinon.stub();
      let expected = <ElmPackageJson> {sourceDirectories: ["foo", "bar"]};
      (<SinonStub>builder.updateSourceDirectoriesAction).returns(expected);
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      let actual = builder.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });
  });

  describe("updateSourceDirectoriesAction", () => {
    it("should update the package json sourceDirectories with the supplied value", () => {
      // arrange
      let expected = ["foo"];

      // act
      let actual = builder.updateSourceDirectoriesAction(expected, "bar", <ElmPackageJson>{});

      // assert
      expect(actual.sourceDirectories).to.equal(expected);
    });

    it("should write the updated package json to the supplied directory", () => {
      // act
      builder.updateSourceDirectoriesAction(["foo"], "bar", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = ["foo"];

      // act
      builder.updateSourceDirectoriesAction(expected, "bar", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith(Sinon.match.any, {sourceDirectories: expected});
    });
  });

  describe("updateDependencies", () => {
    it("should call mergeDependencies with the specified base package json", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.mergeDependencies = Sinon.stub();

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeDependencies)
        .to.have.been.calledWith(sourcePackageJson, Sinon.match.any, Sinon.match.any);
    });

    it("should call mergeDependencies with the specified test package json", () => {
      // arrange
      let config = <LoboConfig> {testFile: "foo", prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.mergeDependencies = Sinon.stub();

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeDependencies)
        .to.have.been.calledWith(Sinon.match.any, testPackageJson, Sinon.match.any);
    });

    it("should call mergeDependencies with the specified testFramework", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.mergeDependencies = Sinon.stub();

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.mergeDependencies)
        .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, config.testFramework);
    });

    it("should return the unaltered base package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.mergeDependencies = Sinon.stub();
      (<SinonStub>builder.mergeDependencies).returns(testPackageJson.dependencies);

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the unaltered test package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.mergeDependencies = Sinon.stub();
      (<SinonStub>builder.mergeDependencies).returns(testPackageJson.dependencies);

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(testPackageJson);
      });
    });

    it("should not prompt the user before running updating source directories when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockConfirm).not.to.have.been.called;
      expect(builder.updateDependenciesAction).to.have.been.calledWith();
    });

    it("should prompt the user before running updating source directories when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(mockConfirm).to.have.been.called;
      expect(builder.updateDependenciesAction).not.to.have.been.called;
    });

    it("should not call updateDependenciesAction when config.prompt is true and error occurs", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);
      actual.catchReturn({});

      // assert
      expect(builder.updateDependenciesAction).not.to.have.been.called;
    });

    it("should not call updateDependenciesAction when config.prompt is true and user answers false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);
      actual.catchReturn({});

      // assert
      expect(builder.updateDependenciesAction).not.to.have.been.called;
    });

    it("should call updateDependenciesAction with merged dependencies when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      builder.mergeDependencies = Sinon.stub();
      let expected = ["foo", "bar"];
      (<SinonStub>builder.mergeDependencies).returns(expected);

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.updateDependenciesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      let expected = <ElmPackageJson> {dependencies: <Dependencies>{foo: "qux"}};
      (<SinonStub>builder.updateDependenciesAction).returns(expected);

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });

    it("should call updateDependenciesAction with merged dependencies when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      builder.mergeDependencies = Sinon.stub();
      let expected = ["foo", "bar"];
      (<SinonStub>builder.mergeDependencies).returns(expected);

      // act
      builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      expect(builder.updateDependenciesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      builder.updateDependenciesAction = Sinon.stub();
      let expected = <ElmPackageJson> {dependencies: <Dependencies> {foo: "qux"}};
      (<SinonStub>builder.updateDependenciesAction).returns(expected);
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      let actual = builder.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });
  });

  describe("updateDependenciesAction", () => {
    it("should update the package json dependencies with the supplied value", () => {
      // arrange
      let expected = [["foo", "bar"]];

      // act
      let actual = builder.updateDependenciesAction(expected, "baz", <ElmPackageJson>{});

      // assert
      expect(actual.dependencies).to.deep.equal({foo: "bar"});
    });

    it("should write the updated package json to the supplied directory", () => {
      // act
      builder.updateDependenciesAction([["foo", "bar"]], "baz", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = [["foo", "baz"]];

      // act
      builder.updateDependenciesAction(expected, "baz", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith(Sinon.match.any, Sinon.match(value => value.dependencies.foo = "bar"));
    });
  });

  describe("mergeSourceDirectories", () => {
    it("should return array with current dir only when no other dirs are specified", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {sourceDirectories: []}};

      // act
      let actual = builder.mergeSourceDirectories(<ElmPackageJson>{}, "sourceDir", <ElmPackageJson>{}, "testDir", testFramework);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir only when no other dirs are specified other than the test source directories", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {sourceDirectories: []}};

      // act
      let actual = builder.mergeSourceDirectories(<ElmPackageJson>{}, "sourceDir", <ElmPackageJson>{sourceDirectories: ["."]}, "testDir", testFramework);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include(".");
    });

    it("should return array with current dir relative test directory", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {sourceDirectories: ["foo"]}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = builder.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "testDir", testFramework);

      // assert
      expect(actual).to.include(".");
    });

    it("should return array with test directory relative test directory", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {sourceDirectories: ["foo"]}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = builder.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "testDir", testFramework);

      // assert
      expect(actual).to.include("test");
    });

    it("should return array with base source directories relative test directory", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {sourceDirectories: ["foo"]}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = builder.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "testDir", testFramework);

      // assert
      expect(actual).to.include("../sourceDir/source");
    });

    it("should return array with lobo relative test directory", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {config: {sourceDirectories: ["foo"]}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = builder.mergeSourceDirectories(sourcePackageJson, "sourceDir", testPackageJson, "testDir", testFramework);

      // assert
      expect(actual).to.include.something.that.match(/..\/foo/);
    });
  });

  describe("addSourceDirectories", () => {
    it("should return the unaltered source directories when the additions does not exist", () => {
      // arrange
      let expected = ["abc"];

      // act
      let actual = builder.addSourceDirectories(undefined, "foo", "bar", expected);

      // assert
      expect(actual).to.equal(expected);
    });

    it("should return directories with added additions relative to the test directory when directories are same", () => {
      // act
      let actual = builder.addSourceDirectories(["foo"], "bar", "bar", ["qux"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("foo");
    });

    it("should return directories with added additions relative to the test directory when directories are different", () => {
      // act
      let actual = builder.addSourceDirectories(["foo"], "bar", "baz", ["qux"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../bar/foo");
    });

    it("should return directories with added additions relative to the test directory when test directory is sub-directory", () => {
      // act
      let actual = builder.addSourceDirectories(["foo"], "bar", "bar/baz", ["qux"]);

      // assert
      expect(actual).to.include("qux");
      expect(actual).to.include("../foo");
    });
  });

  describe("mergeDependencies", () => {
    it("should return empty dependency list when source, test and framework dependencies do not exist", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{};
      let testPackageJson = <ElmPackageJson>{};
      let testFramework = <PluginTestFrameworkWithConfig> {config: {}};

      // act
      let actual = builder.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

      // assert
      expect(actual.length).to.equal(0);
    });

    it("should return the source and test framework dependencies when the test dependencies does not exist", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "foo"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> undefined};
      let testFramework = <PluginTestFrameworkWithConfig> {config: {dependencies: <Dependencies> {framework: "baz"}}};

      // act
      let actual = builder.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

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
      let actual = builder.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

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
      let actual = builder.mergeDependencies(sourcePackageJson, testPackageJson, testFramework);

      // assert
      expect(actual.length).to.equal(1);
      expect(actual).to.include.something.deep.equal(["foo", "bar"]);
    });
  });

  describe("isNotExistingDependency", () => {
    it("should return false when the candidate exists in the dependencies", () => {
      // act
      let actual = builder.isNotExistingDependency([["foo", "bar"]], ["foo", "bar"]);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the candidate does not exist in the dependencies", () => {
      // act
      let actual = builder.isNotExistingDependency([["foo", "bar"]], ["baz", "qux"]);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("installDependencies", () => {
    it("should return a promise that calls runElmPackageInstall with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      builder.runElmPackageInstall = Sinon.spy();

      // act
      builder.installDependencies(config, "bar");

      // assert
      expect(builder.runElmPackageInstall).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
    });

    it("should return a promise that calls runElmPackageInstall with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      builder.runElmPackageInstall = Sinon.spy();

      // act
      builder.installDependencies(config, "bar");

      // assert
      expect(builder.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
    });

    it("should return a promise that calls runElmPackageInstall with the supplied config.prompt", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      builder.runElmPackageInstall = Sinon.spy();

      // act
      builder.installDependencies(config, "bar");

      // assert
      expect(builder.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true);
    });
  });

  describe("runElmPackageInstall", () => {
    let revertChildProcess: () => void;
    let mockExec: SinonStub;
    let mockResolve: () => void;
    let mockReject: (Error) => void;

    beforeEach(() => {
      mockExec = Sinon.stub();
      mockResolve = Sinon.spy();
      mockReject = Sinon.spy();
      revertChildProcess = RewiredBuilder.__set__({childProcess: {execSync: mockExec}});
    });

    afterEach(() => {
      revertChildProcess();
    });

    it("should not call elm-package to install the packages when config.noInstall is true", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo", noInstall: true};

      // act
      builder.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).not.to.have.been.called;
    });

    it("should call elm-package to install the packages", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/elm-package install/), Sinon.match.any);
    });

    it("should call elm-package to install the packages from the specified elm-install path", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/^foo(\/|\\)elm-package install/), Sinon.match.any);
    });

    it("should call elm-package to install the packages without --yes when prompt is true", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--yes") === -1), Sinon.match.any);
    });

    it("should call elm-package to install the packages with --yes when prompt is false", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/ --yes/), Sinon.match.any);
    });

    it("should call elm-package to install the packages with cwd as the supplied directory", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match.any, Sinon.match((x => x.cwd === "bar")));
    });

    it("should call resolve when there are no elm-package install errors", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should catch any elm-package installation errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {};
      let expected = new Error();
      mockExec.throws(expected);

      // act
      builder.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });
  });

  describe("make", () => {
    let revertChildProcess: () => void;
    let revertConsole: () => void;
    let mockExec: SinonStub;

    beforeEach(() => {
      mockExec = Sinon.stub();
      revertChildProcess = RewiredBuilder.__set__({childProcess: {execSync: mockExec}});
      revertConsole = RewiredBuilder.__set__({console: {log: Sinon.stub()}});
    });

    afterEach(() => {
      revertChildProcess();
      revertConsole();
    });

    it("should call elm-make to build the tests", () => {
      // arrange
      let config = <LoboConfig> {compiler: "abc", testFramework: {config: {name: "foo"}}, testMainElm: "bar"};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/^abc(\/|\\)elm-make /), Sinon.match.any);
    });

    it("should call elm-package to install the packages from the specified elm-install path", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      builder.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/^foo(\/|\\)elm-package install/), Sinon.match.any);
    });

    it("should call elm-make to build the tests to the specified output testFile", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", testFile: "baz"};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/--output=baz/), Sinon.match.any);
    });

    it("should call elm-make to build the tests without --yes when prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", prompt: true};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--yes") === -1), Sinon.match.any);
    });

    it("should call elm-make to build the tests with --yes when prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", prompt: false};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/ --yes/), Sinon.match.any);
    });

    it("should call elm-make to build the tests without --warn when noWarn is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", noWarn: true};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--warn") === -1), Sinon.match.any);
    });

    it("should call elm-make to build the tests with --warn when noWarn is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", noWarn: false};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/ --warn/), Sinon.match.any);
    });

    it("should call elm-make to build the tests with cwd as supplied directory", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar", noWarn: false};

      // act
      builder.make(config, "bar");

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match.any, Sinon.match(x => x.cwd === "bar"));
    });

    it("should call resolve when there are no elm-make build errors", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar"};

      // act
      let actual = builder.make(config, "bar");

      // assert
      actual.then(() => {
        expect(mockExec).to.have.been.called;
      });
    });

    it("should catch any elm-make build errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {name: "foo"}}, testMainElm: "bar"};
      let expected = new Error();
      mockExec.throws(expected);

      // act
      let actual = builder.make(config, "bar");

      // assert
      actual.catch((err) => {
        expect(err).to.equal(expected);
      });
    });
  });
});
