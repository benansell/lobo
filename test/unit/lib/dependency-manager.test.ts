"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {DependencyManager, DependencyManagerImp, createDependencyManager, ElmPackageCompare} from "../../../lib/dependency-manager";
import {Dependencies, ExecutionContext, LoboConfig, PluginTestFrameworkWithConfig} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";
import {ElmPackageHelper, ElmPackageJson, UpdateCallback} from "../../../lib/elm-package-helper";

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
      path: x => x,
      read: Sinon.stub(),
      updateDependencies: Sinon.stub(),
      updateSourceDirectories: Sinon.stub()
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
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
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
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.readElmPackage).to.have.been.calledWith(Sinon.match.any, "baz");
      });
    });

    it("should call updateSourceDirectories with the supplied config.prompt value", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateSourceDirectories).to.have.been
          .calledWith(true, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateSourceDirectories with the supplied base package directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
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
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "abc", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
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
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
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
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
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

    it("should call updateSourceDirectories with the result.target from readElmPackage", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "abc"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
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

    it("should call updateDependencies with the supplied config.prompt value", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies).to.have.been.calledWith(true, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateDependencies with the result.base from updateSourceDirectories", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "abc", target: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "abc", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call updateDependencies with the supplied test directory", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "abc", target: "b"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should call updateDependencies with the result.target from updateSourceDirectories", () => {
      // arrange
      let config = <LoboConfig> {prompt: true};
      dependencyManager.readElmPackage = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.readElmPackage).resolves({base: "a", target: "b"});
      dependencyManager.updateSourceDirectories = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateSourceDirectories).resolves({base: "a", target: "abc"});
      dependencyManager.updateDependencies = Sinon.stub();
      (<Sinon.SinonStub>dependencyManager.updateDependencies).resolves({});

      // act
      let actual = dependencyManager.syncTestElmPackage(config, "bar", "baz", "qux");

      // assert
      return actual.then(() => {
        expect(dependencyManager.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, "abc");
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
      return actual.then((result: ElmPackageCompare) => {
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
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(expectedTest);
      });
    });
  });

  describe("updateSourceDirectories", () => {
    it("should call helper.updateSourceDirectories with the specified baseElmPackgaeDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith("bar", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateSourceDirectories with the specified baseElmPackage", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateSourceDirectories with the specified testElmPackageDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateSourceDirectories with the specified main testDir", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, "qux", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateSourceDirectories with the specified testElmPackage", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any);
      });
    });

    it("should call helper.updateSourceDirectories with empty extra directories list", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, [],
                                   Sinon.match.any);

      });
    });

    it("should call helper.updateSourceDirectories with a callback", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateSourceDirectories)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any,
                                   Sinon.match.func);
      });
    });

    it("should return the unaltered base package json when there is no difference", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the unaltered test package json when there is no difference", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(testPackageJson);
      });
    });

    it("should not prompt the user before running updating source directories when config.prompt is false", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["foo"], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(false, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockConfirm).not.to.have.been.called;
        expect(updateAction).to.have.been.calledWith();
      });
    });

    it("should prompt the user before running updating source directories when config.prompt is true", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["foo"], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(updateAction).not.to.have.been.called;
      });
    });

    it("should not call updateAction when config.prompt is true and error occurs", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      mockConfirm.callsFake((message, defaults, action) => action({}, "abc"));
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["foo"], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(updateAction).not.to.have.been.called;
      });
    });

    it("should not call updateAction when config.prompt is true and user answers false", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["foo"], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(updateAction).not.to.have.been.called;
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is false", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(false, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is false", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let expected = <ElmPackageJson> {sourceDirectories: ["foo", "bar"]};
      let updateAction = Sinon.stub();
      updateAction.returns(expected);
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["foo"], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(false, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(expected);
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is true", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let updateAction = Sinon.stub();
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is true", () => {
      // arrange
      let sourcePackageJson = <ElmPackageJson>{sourceDirectories: ["source"]};
      let testPackageJson = <ElmPackageJson>{sourceDirectories: ["test"]};
      let expected = <ElmPackageJson> {sourceDirectories: ["foo", "bar"]};
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      let updateAction = Sinon.stub();
      updateAction.returns(expected);
      mockHelper.updateSourceDirectories = (...args) => {
        const updateCallback: UpdateCallback<string[]> = args[args.length - 1];
        updateCallback(["foo"], updateAction);
      };

      // act
      let actual = dependencyManager.updateSourceDirectories(true, "bar", sourcePackageJson, "baz", "qux", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(expected);
      });
    });
  });

  describe("updateDependencies", () => {
    it("should call helper.updateDependencies with the specified test framework", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateDependencies)
          .to.have.been.calledWith(testFramework, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencies with the specified baseElmPackage", () => {
      // arrange
      let testFramework = <PluginTestFrameworkWithConfig> {};
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, sourcePackageJson, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencies with the specified testPackageDir", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, "baz", Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencies with the specified testElmPackageDir", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, testPackageJson, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencies with a callback", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = Sinon.spy((...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      });

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockHelper.updateDependencies)
          .to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.func);
      });
    });

    it("should return the unaltered base package json when there is no difference", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the unaltered test package json when there is no difference", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(testPackageJson);
      });
    });

    it("should not prompt the user before running updating source directories when config.prompt is false", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(false, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.finally(() => {
        expect(mockConfirm).not.to.have.been.called;
        expect(updateAction).to.have.been.calledWith();
      });
    });

    it("should prompt the user before running updating source directories when config.prompt is true", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(updateAction).not.to.have.been.called;
      });
    });

    it("should not call updateAction when config.prompt is true and error occurs", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(updateAction).not.to.have.been.called;
      });
    });

    it("should not call updateAction when config.prompt is true and user answers false", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.catch(() => {
        expect(updateAction).not.to.have.been.called;
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is false", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(false, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is false", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let expected = <ElmPackageJson> {dependencies: <Dependencies>{foo: "qux"}};
      let updateAction = Sinon.stub();
      updateAction.returns(expected);
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(false, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(expected);
      });
    });

    it("should return the unaltered base package json when there is a difference and config.prompt is true", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      let updateAction = Sinon.stub();
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.base).to.equal(sourcePackageJson);
      });
    });

    it("should return the updated test package json when there is a difference and config.prompt is true", () => {
      // arrange
      let testFramework: PluginTestFrameworkWithConfig = {
        config: {dependencies: <Dependencies> {foo: "bar"}, sourceDirectories: [], name: "baz", options: []},
        initArgs: Sinon.stub(),
        pluginElmModuleName: Sinon.stub(),
        testFrameworkElmModuleName: Sinon.stub()
      };
      let sourcePackageJson = <ElmPackageJson>{dependencies: <Dependencies> {source: "abc"}};
      let testPackageJson = <ElmPackageJson>{dependencies: <Dependencies> {test: "def"}};
      let expected = <ElmPackageJson> {dependencies: <Dependencies> {foo: "qux"}};
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));
      let updateAction = Sinon.stub();
      updateAction.returns(expected);
      mockHelper.updateDependencies = (...args) => {
        const updateCallback: UpdateCallback<string[][]> = args[args.length - 1];
        updateCallback([["foo"]], updateAction);
      };

      // act
      let actual = dependencyManager.updateDependencies(true, testFramework, sourcePackageJson, "baz", testPackageJson);

      // assert
      return actual.then((result: ElmPackageCompare) => {
        expect(result.target).to.equal(expected);
      });
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
