"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {DependencyManager, DependencyManagerImp, createDependencyManager} from "../../../lib/dependency-manager";
import {Dependencies, ExecutionContext, LoboConfig} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";
import {ElmPackageHelper, ElmPackageJson} from "../../../lib/elm-package-helper";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib dependency-manager", () => {
  let RewiredDependencyManager = rewire("../../../lib/dependency-manager");
  let dependencyManager: DependencyManagerImp;
  let mockConfirm: Sinon.SinonStub;
  let mockHelper: ElmPackageHelper;
  let mockLogger: Logger;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;
  let revertPrompt: () => void;

  beforeEach(() => {
    mockConfirm = Sinon.stub();
    revertPrompt = RewiredDependencyManager.__set__({promptly: {confirm: mockConfirm}});
    let rewiredImp = RewiredDependencyManager.__get__("DependencyManagerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.error = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockHelper = <ElmPackageHelper> {
      isImprovedMinimumConstraint: Sinon.stub(),
      isNotExistingDependency: Sinon.stub(),
      mergeDependencies: Sinon.stub(),
      mergeSourceDirectories: Sinon.stub(),
      path: x => x, read: Sinon.stub(),
      write: Sinon.stub()
    };
    dependencyManager = new rewiredImp(mockHelper, mockLogger);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
  });

  afterEach(() => {
    revertPrompt();
  });

  describe("createDependencyManager", () => {
    it("should return dependencyManager", () => {
      // act
      let actual: DependencyManager = createDependencyManager();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("build", () => {
    it("should not call ensureElmPackageExists when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: true};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureElmPackageExists).not.to.have.been.called;
      });
    });

    it("should not call syncTestElmPackage when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: true};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncTestElmPackage).not.to.have.been.called;
      });
    });

    it("should call installDependencies when config.noUpdate is true", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: true};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.installDependencies).to.have.been.called;
      });
    });

    it("should call ensureElmPackageExists with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureElmPackageExists).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call ensureElmPackageExists with the base directory of '.' and location 'current'", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureElmPackageExists).to.have.been.calledWith(Sinon.match.any, ".", "current");
      });
    });

    it("should call ensureElmPackageExists with the supplied test directory and location of 'test", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testDirectory: "foo", testFile: "bar"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureElmPackageExists).to.have.been.calledWith(Sinon.match.any, "foo", "tests");
      });
    });

    it("should call syncTestElmPackage with the supplied config", () => {
      // arrange
      let config = <LoboConfig> { noUpdate: false};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncTestElmPackage).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call syncTestElmPackage with a base directory of '.'", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncTestElmPackage).to.have.been.calledWith(Sinon.match.any, ".", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call syncTestElmPackage with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testDirectory: "foo", testFile: "bar"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncTestElmPackage).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "foo", Sinon.match.any);
      });
    });

    it("should call syncTestElmPackage with the supplied test file directory", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testDirectory: "foo", testFile: "bar/baz"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncTestElmPackage).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "bar");
      });
    });

    it("should call installDependencies with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testFile: "foo"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.installDependencies).to.have.been.calledWith(config, Sinon.match.any);
      });
    });

    it("should call installDependencies with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {noUpdate: false};
      let context = <ExecutionContext> {config, testDirectory: "foo", testFile: "bar"};
      dependencyManager.ensureElmPackageExists = Sinon.stub();
      dependencyManager.syncTestElmPackage = Sinon.stub();
      dependencyManager.installDependencies = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.installDependencies).to.have.been.calledWith(Sinon.match.any, "foo");
      });
    });
  });

  describe("ensureElmPackageExists", () => {
    describe("shelljs test is true", () => {
      let revertShellJs: () => void;

      beforeEach(() => {
        revertShellJs = RewiredDependencyManager.__set__({shelljs: {test: () => true}});
      });

      afterEach(() => {
        revertShellJs();
      });

      it("should do nothing when elm-package.json already exists", () => {
        // arrange
        let config = <LoboConfig> {prompt: false};

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.finally(() => {
          expect(actual.isResolved()).to.be.true;
        });
      });
    });

    describe("shelljs test is false", () => {
      let revertShellJs: () => void;

      beforeEach(() => {
        revertShellJs = RewiredDependencyManager.__set__({shelljs: {test: () => false}});
      });

      afterEach(() => {
        revertShellJs();
      });

      it("should not prompt the user before running elm package install when config.prompt is false", () => {
        // arrange
        let config = <LoboConfig> {prompt: false};
        dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.finally(() => {
          expect(mockConfirm).not.to.have.been.called;
          expect(dependencyManager.runElmPackageInstall).to.have.been.calledWith();
        });
      });

      it("should prompt the user before running elm package install when config.prompt is true", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(dependencyManager.runElmPackageInstall).not.to.have.been.called;
        });
      });

      it("should not call runElmPackageInstall when config.prompt is true and error occurs", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.catch(() => {
          expect(dependencyManager.runElmPackageInstall).not.to.have.been.called;
        });
      });

      it("should not call runElmPackageInstall when config.prompt is true and user answers false", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.catch(() => {
          expect(dependencyManager.runElmPackageInstall).not.to.have.been.called;
        });
      });

      it("should call runElmPackageInstall with prompt false when config.prompt is false", () => {
        // arrange
        let config = <LoboConfig> {prompt: false};
        dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.finally(() => {
          expect(dependencyManager.runElmPackageInstall).to.have.been
            .calledWith(Sinon.match.any, Sinon.match.any, false, Sinon.match.any, Sinon.match.any);
        });
      });

      it("should call runElmPackageInstall with prompt true when config.prompt is true", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

        // act
        let actual = dependencyManager.ensureElmPackageExists(config, "foo", "bar");

        // assert
        return actual.finally(() => {
          expect(dependencyManager.runElmPackageInstall).to.have.been
            .calledWith(Sinon.match.any, Sinon.match.any, true, Sinon.match.any, Sinon.match.any);
        });
      });
    });
  });

  describe("syncTestElmPackage", () => {
    it("should call readElmPackage with the supplied base package directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.readElmPackage).to.have.been.calledWith("bar", Sinon.match.any);
      });
    });

    it("should call readElmPackage with the supplied test package directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.readElmPackage).to.have.been.calledWith(Sinon.match.any, "baz");
      });
    });

    it("should call updateSourceDirectories with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories).to.have.been
          .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the supplied base package directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the result.base from readElmPackage", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "abc", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "abc", Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the supplied test package directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the supplied test dir", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, "qux", Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the result.test from readElmPackage", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "abc"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, "abc");
      });
    });

    it("should call updateDependencies with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateDependencies with the result.base from updateSourceDirectories", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "abc", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies).to.have.been.calledWith(Sinon.match.any, "abc", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateDependencies with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "abc", test: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should call updateDependencies with the result.test from updateSourceDirectories", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", test: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", test: "abc"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "abc");
      });
    });
  });

  describe("readElmPackage", () => {
    it("should log an error when unable to read the source elm-package.json from the supplied base directory", () => {
      // arrange
      (<Sinon.SinonStub>mockHelper.read).onSecondCall().returns({});

      // act
      let actual = dependencyManager.readElmPackage("foo", "bar");

      // assert
      return actual.catch(() => {
        expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/main elm-package.json/));
      });
    });

    it("should log an error when unable to read the test elm-package.json from the supplied test directory", () => {
      // arrange
      (<Sinon.SinonStub>mockHelper.read).onFirstCall().returns({});

      // act
      let actual = dependencyManager.readElmPackage("foo", "bar");

      // assert
      return actual.catch(() => {
        expect(mockLogger.error).to.have.been.calledWith(Sinon.match(/test elm-package.json/));
      });
    });

    it("should read the source elm-package.json from the supplied base directory", () => {
      // arrange
      (<Sinon.SinonStub>mockHelper.read).returns({});

      // act
      let actual = dependencyManager.readElmPackage("foo", "bar");

      // assert
      return actual.finally(() => {
        expect(mockHelper.read).to.have.been.calledWith("foo");
      });
    });

    it("should read the test elm-package.json from the supplied test directory", () => {
      // arrange
      (<Sinon.SinonStub>mockHelper.read).returns({});

      // act
      let actual = dependencyManager.readElmPackage("foo", "bar");

      // assert
      return actual.finally(() => {
        expect(mockHelper.read).to.have.been.calledWith("bar");
      });
    });

    it("should return the base json values", () => {
      // arrange
      let expectedSource = {name: "source"};
      let expectedTest = {name: "test"};
      (<Sinon.SinonStub>mockHelper.read).onFirstCall().returns(expectedSource);
      (<Sinon.SinonStub>mockHelper.read).onSecondCall().returns(expectedTest);

      // act
      let actual = dependencyManager.readElmPackage("foo", "bar");

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(expectedSource);
      });
    });

    it("should return the test json values", () => {
      // arrange
      let expectedSource = {name: "source"};
      let expectedTest = {name: "test"};
      (<Sinon.SinonStub>mockHelper.read).onFirstCall().returns(expectedSource);
      (<Sinon.SinonStub>mockHelper.read).onSecondCall().returns(expectedTest);

      // act
      let actual = dependencyManager.readElmPackage("foo", "bar");

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expectedTest);
      });
    });
  });

  describe("updateSourceDirectories", () => {
    it("should call mergeSourceDirectories with the specified base package json", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeSourceDirectories)
          .to.have.been.calledWith(sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call mergeSourceDirectories with the specified base directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call mergeSourceDirectories with the specified test package json", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call mergeSourceDirectories with the specified main test directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should call mergeSourceDirectories with the specified test file directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, "qux");
      });
    });

    it("should return the unaltered base package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(testPackageJson.sourceDirectories);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the unaltered test package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(testPackageJson.sourceDirectories);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(testPackageJson);
      });
    });

    it("should not prompt the user before running updating source directories when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(["test", ".", "qux", "../bar/source"]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([".", "qux", "../bar/source"]);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockConfirm).not.to.have.been.called;
        expect(dependencyManager.updateSourceDirectoriesAction).to.have.been.calledWith();
      });
    });

    it("should prompt the user before running updating source directories when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(["test", ".", "qux", "../bar/source"]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([".", "qux", "../bar/source"]);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(dependencyManager.updateSourceDirectoriesAction).not.to.have.been.called;
      });
    });

    it("should not call updateSourceDirectoriesAction when config.prompt is true and error occurs", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(["test", ".", "qux", "../bar/source"]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([".", "qux", "../bar/source"]);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.updateSourceDirectoriesAction).not.to.have.been.called;
      });
    });

    it("should not call updateSourceDirectoriesAction when config.prompt is true and user answers false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(["test", ".", "qux", "../bar/source"]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([".", "qux", "../bar/source"]);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.updateSourceDirectoriesAction).not.to.have.been.called;
      });
    });

    it("should call updateSourceDirectoriesAction with merged sourceDirectories when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      let expected = ["foo", "bar"];
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(expected);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.updateSourceDirectoriesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      let expected = <ElmPackageJson> {sourceDirectories: ["foo", "bar"]};
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectoriesAction).returns(expected);
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(["test", ".", "qux", "../bar/source"]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([".", "qux", "../bar/source"]);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });

    it("should call updateSourceDirectoriesAction with merged sourceDirectories when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      let expected = ["foo", "bar"];
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(expected);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.updateSourceDirectoriesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      dependencyManager.updateSourceDirectoriesAction = Sinon.stub();
      let expected = <ElmPackageJson> {sourceDirectories: ["foo", "bar"]};
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectoriesAction).returns(expected);
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      (<Sinon.SinonStub>mockHelper.mergeSourceDirectories).returns(["test", ".", "qux", "../bar/source"]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([".", "qux", "../bar/source"]);

      // act
      let actual = dependencyManager.updateSourceDirectories(config, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });
  });

  describe("updateSourceDirectoriesAction", () => {
    it("should update the package json sourceDirectories with the supplied value", () => {
      // arrange
      let expected = ["foo"];

      // act
      let actual = dependencyManager.updateSourceDirectoriesAction(expected, "bar", <ElmPackageJson>{});

      // assert
      expect(actual.sourceDirectories).to.equal(expected);
    });

    it("should write the updated package json to the supplied directory", () => {
      // act
      dependencyManager.updateSourceDirectoriesAction(["foo"], "bar", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith("bar", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = ["foo"];

      // act
      dependencyManager.updateSourceDirectoriesAction(expected, "bar", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith(Sinon.match.any, {sourceDirectories: expected});
    });
  });

  describe("updateDependencies", () => {
    it("should call mergeDependencies with the specified base package json", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeDependencies)
          .to.have.been.calledWith(sourcePackageJson, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call mergeDependencies with the specified test package json", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeDependencies)
          .to.have.been.calledWith(Sinon.match.any, testPackageJson, Sinon.match.any);
      });
    });

    it("should call mergeDependencies with the specified testFramework", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.mergeDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, config.testFramework);
      });
    });

    it("should return the unaltered base package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns(testPackageJson.dependencies);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the unaltered test package json when there is no difference", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns(testPackageJson.dependencies);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(testPackageJson);
      });
    });

    it("should not prompt the user before running updating source directories when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns([["test", "def"], ["source", "abc"], ["foo", "bar"]]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockConfirm).not.to.have.been.called;
        expect(dependencyManager.updateDependenciesAction).to.have.been.calledWith();
      });
    });

    it("should prompt the user before running updating source directories when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns([["test", "def"], ["source", "abc"], ["foo", "bar"]]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(dependencyManager.updateDependenciesAction).not.to.have.been.called;
      });
    });

    it("should not call updateDependenciesAction when config.prompt is true and error occurs", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns([["test", "def"], ["source", "abc"], ["foo", "bar"]]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.updateDependenciesAction).not.to.have.been.called;
      });
    });

    it("should not call updateDependenciesAction when config.prompt is true and user answers false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns([["test", "def"], ["source", "abc"], ["foo", "bar"]]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.updateDependenciesAction).not.to.have.been.called;
      });
    });

    it("should call updateDependenciesAction with merged dependencies when config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      const expected = [["test", "def"], ["source", "abc"], ["foo", "bar"]];
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns(expected);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.updateDependenciesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is false", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: false};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      let expected = <ElmPackageJson> {dependencies: <Dependencies>{foo: "qux"}};
      (<Sinon.SinonStub>dependencyManager.updateDependenciesAction).returns(expected);
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns([["test", "def"], ["source", "abc"], ["foo", "bar"]]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });

    it("should call updateDependenciesAction with merged dependencies when config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      let expected = [["test", "def"], ["source", "abc"], ["foo", "bar"]];
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns(expected);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.updateDependenciesAction).to.have.been.calledWith(expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: { base: {} }) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is true", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {dependencies: <Dependencies> {foo: "bar"}}}, prompt: true};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      dependencyManager.updateDependenciesAction = Sinon.stub();
      let expected = <ElmPackageJson> {dependencies: <Dependencies> {foo: "qux"}};
      (<Sinon.SinonStub>dependencyManager.updateDependenciesAction).returns(expected);
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      (<Sinon.SinonStub>mockHelper.mergeDependencies).returns([["test", "def"], ["source", "abc"], ["foo", "bar"]]);
      (<Sinon.SinonStub>mockHelper.isNotExistingDependency).returns([["source", "abc"], ["foo", "bar"]]);

      // act
      let actual = dependencyManager.updateDependencies(config, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: { test: {} }) => {
        expect(result.test).to.equal(expected);
      });
    });
  });

  describe("updateDependenciesAction", () => {
    it("should update the package json dependencies with the supplied value", () => {
      // arrange
      let expected = [["foo", "bar"]];

      // act
      let actual = dependencyManager.updateDependenciesAction(expected, "baz", <ElmPackageJson>{});

      // assert
      expect(actual.dependencies).to.deep.equal({foo: "bar"});
    });

    it("should write the updated package json to the supplied directory", () => {
      // act
      dependencyManager.updateDependenciesAction([["foo", "bar"]], "baz", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith("baz", Sinon.match.any);
    });

    it("should write the updated package json to the supplied directory", () => {
      // arrange
      let expected = [["foo", "baz"]];

      // act
      dependencyManager.updateDependenciesAction(expected, "baz", <ElmPackageJson>{});

      // assert
      expect(mockHelper.write).to.have.been.calledWith(Sinon.match.any, Sinon.match(value => value.dependencies.foo = "bar"));
    });
  });

  describe("installDependencies", () => {
    it("should return a promise that calls runElmPackageInstall with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      let actual = dependencyManager.installDependencies(config, "bar");

      // assert
      return actual.finally(() => {
        expect(dependencyManager.runElmPackageInstall).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should return a promise that calls runElmPackageInstall with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}};
      dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      let actual = dependencyManager.installDependencies(config, "bar");

      // assert
      return actual.finally(() => {
        expect(dependencyManager.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
      });
    });

    it("should return a promise that calls runElmPackageInstall with the supplied config.prompt", () => {
      // arrange
      let config = <LoboConfig> {testFramework: {config: {sourceDirectories: ["foo"]}}, prompt: true};
      dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      let actual = dependencyManager.installDependencies(config, "bar");

      // assert
      return actual.finally(() => {
        expect(dependencyManager.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true);
      });
    });
  });

  describe("runElmPackageInstall", () => {
    let revertChildProcess: () => void;
    let mockExec: Sinon.SinonStub;

    beforeEach(() => {
      mockExec = Sinon.stub();
      mockResolve = Sinon.spy();
      mockReject = Sinon.spy();
      revertChildProcess = RewiredDependencyManager.__set__({childProcess: {execSync: mockExec}});
    });

    afterEach(() => {
      revertChildProcess();
    });

    it("should not call elm-package to install the packages when config.noInstall is true", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo", noInstall: true};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).not.to.have.been.called;
    });

    it("should call elm-package to install the packages", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/elm-package install/), Sinon.match.any);
    });

    it("should call elm-package to install the packages from the specified elm-install path", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/^foo([\/\\])elm-package install/), Sinon.match.any);
    });

    it("should call elm-package to install the packages without --yes when prompt is true", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match((x) => x.indexOf("--yes") === -1), Sinon.match.any);
    });

    it("should call elm-package to install the packages with --yes when prompt is false", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match(/ --yes/), Sinon.match.any);
    });

    it("should call elm-package to install the packages with cwd as the supplied directory", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockExec).to.have.been.calledWith(Sinon.match.any, Sinon.match((x => x.cwd === "bar")));
    });

    it("should call resolve when there are no elm-package install errors", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should catch any elm-package installation errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {};
      let expected = new Error();
      mockExec.throws(expected);

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });
  });
});
