"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {DependencyManager, DependencyManagerImp, createDependencyManager} from "../../../lib/dependency-manager";
import {ApplicationDependencies, ExecutionContext, LoboConfig, VersionSpecification, VersionSpecificationInvalid} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";
import {ElmJson, ElmPackageHelper} from "../../../lib/elm-package-helper";
import {Util} from "../../../lib/util";

let expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib dependency-manager", () => {
  let RewiredDependencyManager = rewire("../../../lib/dependency-manager");
  let dependencyManager: DependencyManagerImp;
  let mockConfirm: Sinon.SinonStub;
  let mockHelper: ElmPackageHelper;
  let mockLogger: Logger;
  let mockRead: Sinon.SinonStub;
  let mockRunElmCommand: Sinon.SinonStub;
  let mockUtil: Util;
  let mockUpdateDependencies: Sinon.SinonStub;
  let mockUpdateDependencyVersions: Sinon.SinonStub;
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
    mockLogger.warn = Sinon.spy();
    mockRead = Sinon.stub();
    mockUpdateDependencies = Sinon.stub();
    mockUpdateDependencyVersions = Sinon.stub();
    mockHelper = <ElmPackageHelper> {
      path: x => x,
      read: mockRead,
      updateDependencies: mockUpdateDependencies,
      updateDependencyVersions: mockUpdateDependencyVersions,
      updateSourceDirectories: Sinon.stub()
    };

    mockUtil = <Util> {};
    mockRunElmCommand = Sinon.stub();
    mockUtil.runElmCommand = mockRunElmCommand;
    dependencyManager = new rewiredImp(mockHelper, mockLogger, mockUtil);

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
    it("should call ensureElmPackageExists with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {noCleanup: false};
      let context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.syncDependencyVersions = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureAppElmJsonExists).to.have.been.calledWith(config);
      });
    });

    it("should call syncDependencies with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {noCleanup: false};
      let context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.syncDependencyVersions = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncDependencies).to.have.been.calledWith(config);
      });
    });

    it("should call syncDependencyVersions with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {noCleanup: false};
      let context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.syncDependencyVersions = Sinon.stub();

      // act
      let actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncDependencyVersions).to.have.been.calledWith(config);
      });
    });
  });

  describe("ensureAppElmJsonExists", () => {
    describe("shelljs test is true", () => {
      let revertShellJs: () => void;

      beforeEach(() => {
        revertShellJs = RewiredDependencyManager.__set__({shelljs: {test: () => true}});
      });

      afterEach(() => {
        revertShellJs();
      });

      it("should do nothing when elm.json already exists", () => {
        // arrange
        let config = <LoboConfig> {prompt: false};

        // act
        let actual = dependencyManager.ensureAppElmJsonExists(config);

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

      it("should prompt the user before running elm package install when config.prompt is true", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmInit = Sinon.spy();
        mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

        // act
        let actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(dependencyManager.runElmInit).not.to.have.been.called;
        });
      });

      it("should not call runElmPackageInstall when config.prompt is true and error occurs", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmInit = Sinon.spy();
        mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

        // act
        let actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.catch(() => {
          expect(dependencyManager.runElmInit).not.to.have.been.called;
        });
      });

      it("should not call runElmPackageInstall when config.prompt is true and user answers false", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmInit = Sinon.spy();
        mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

        // act
        let actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.catch(() => {
          expect(dependencyManager.runElmInit).not.to.have.been.called;
        });
      });

      it("should call runElmPackageInstall with prompt false when config.prompt is false", () => {
        // arrange
        let config = <LoboConfig> {prompt: false};
        dependencyManager.runElmInit = Sinon.spy((conf, prompt, resolve) => resolve());

        // act
        let actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.finally(() => {
          expect(dependencyManager.runElmInit).to.have.been
            .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any);
        });
      });

      it("should call runElmPackageInstall with prompt true when config.prompt is true", () => {
        // arrange
        let config = <LoboConfig> {prompt: true};
        dependencyManager.runElmInit = Sinon.spy((conf, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

        // act
        let actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.finally(() => {
          expect(dependencyManager.runElmInit).to.have.been
            .calledWith(Sinon.match.any, true, Sinon.match.any, Sinon.match.any);
        });
      });
    });
  });

  describe("syncDependencies", () => {
    it("should not call elmPackageHelper.updateDependencies when read elm json is undefined", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns(undefined);
        dependencyManager.installDependencies = Sinon.stub().resolves();

        // act
        let actual = dependencyManager.syncDependencies(config);

        // assert
        return actual.catch(() => {
          expect(mockUpdateDependencies).not.to.have.been.called;
        });
      });

    it("should call elmPackageHelper.updateDependencies with the config.appDirectory", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockRead.returns({});
      mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencies(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencies).to.have.been
          .calledWith(config.appDirectory, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateDependencies with the elm.json read from the appDir", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      const expected = <ElmJson> {sourceDirectories: ["bar"]};
      mockRead.withArgs("foo").returns(expected);
      mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencies(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencies).to.have.been
          .calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateDependencies with the test framework dependencies", () => {
      // arrange
      let directDependencies = {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {dependencies: expected}}};
      mockRead.returns({});
      mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencies(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencies).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateDependencies with empty test dependencies", () => {
      // arrange
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: {}, indirect: {}};
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockRead.returns({});
      mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencies(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencies).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateDependencies with callback that does not call update action when no deps are missing", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockRead.returns({});
      const mockAction = Sinon.stub();
      mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({}, mockAction);
      });

      // act
      let actual = dependencyManager.syncDependencies(config);

      // assert
      return actual.finally(() => {
        expect(mockAction).not.to.have.been.called;
      });
    });

    it("should call updateDependencies with callback that calls update action when deps are missing and prompt is false", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: false};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });

        // act
        let actual = dependencyManager.syncDependencies(config);

        // assert
        return actual.finally(() => {
          expect(mockAction).to.have.been.called;
        });
      });

    it("should call elmPackageHelper.updateDependencies with callback that prompts user when deps are missing and prompt is true", () => {
         // arrange
         let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
         mockRead.returns({});
         const mockAction = Sinon.stub();
         mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
           callback({"bar": "baz"}, mockAction);
         });
         mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
         dependencyManager.installDependencies = Sinon.stub().resolves();

         // act
         let actual = dependencyManager.syncDependencies(config);

         // assert
         return actual.finally(() => {
           expect(mockConfirm).to.have.been.called;
           expect(mockAction).not.to.have.been.called;
           expect(dependencyManager.installDependencies).to.have.been.calledWith(config, ["bar"]);
         });
       });

    it("should call elmPackageHelper.updateDependencies with callback that prompts user and calls reject on install deps error", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
        dependencyManager.installDependencies = Sinon.stub().rejects();

        // act
        let actual = dependencyManager.syncDependencies(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).not.to.have.been.called;
        });
      });

    it("should call updateDependencies with callback that prompts user and calls reject on 'No' when prompt is true", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action(null, "false"));
        dependencyManager.installDependencies = Sinon.stub();

        // act
        let actual = dependencyManager.syncDependencies(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).not.to.have.been.called;
          expect(dependencyManager.installDependencies).not.to.have.been.called;
        });
      });

    it("should call elmPackageHelper.updateDependencies with callback that prompts user and calls reject error when prompt is true", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencies.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action("fail", "false"));
        dependencyManager.installDependencies = Sinon.stub();

        // act
        let actual = dependencyManager.syncDependencies(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).not.to.have.been.called;
          expect(dependencyManager.installDependencies).not.to.have.been.called;
        });
      });
  });

  describe("syncDependencyVersions", () => {
    it("should not call elmPackageHelper.updateDependencyVersions when read elm json is undefined", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      mockRead.returns(undefined);

      // act
      let actual = dependencyManager.syncDependencyVersions(config);

      // assert
      return actual.catch(() => {
        expect(mockUpdateDependencyVersions).not.to.have.been.called;
      });
    });

    it("should call helper.updateDependencyVersions with the config.appDirectory", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockRead.returns({});
      mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencyVersions(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(config.appDirectory, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with the elm.json read from the appDir", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      const expected = <ElmJson> {sourceDirectories: ["bar"]};
      mockRead.withArgs("foo").returns(expected);
      mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencyVersions(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(Sinon.match.any, expected, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with the test framework dependencies", () => {
      // arrange
      let directDependencies = {"foo": <VersionSpecificationInvalid> {type: "invalid", version: "bar"}};
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: directDependencies, indirect: {}};
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {dependencies: expected}}};
      mockRead.returns({});
      mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencyVersions(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with empty test dependencies", () => {
      // arrange
      let expected = <ApplicationDependencies<VersionSpecification>> {direct: {}, indirect: {}};
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockRead.returns({});
      mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({});
      });

      // act
      let actual = dependencyManager.syncDependencyVersions(config);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with callback that does not call update action when no deps are missing", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockRead.returns({});
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
        callback({}, mockAction);
      });

      // act
      let actual = dependencyManager.syncDependencyVersions(config);

      // assert
      return actual.finally(() => {
        expect(mockAction).not.to.have.been.called;
      });
    });

    it("should call updateDependencyVersions with callback that calls update action when deps are missing and prompt is false", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: false};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });

        // act
        let actual = dependencyManager.syncDependencyVersions(config);

        // assert
        return actual.finally(() => {
          expect(mockAction).to.have.been.called;
        });
      });

    it("should call helper.updateDependencyVersions with callback that prompts user when deps are missing and prompt is true", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
        dependencyManager.installDependencies = Sinon.stub().resolves();

        // act
        let actual = dependencyManager.syncDependencyVersions(config);

        // assert
        return actual.finally(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).to.have.been.called;
        });
      });

    it("should call helper.updateDependencyVersions with callback that prompts user and calls reject on install deps error", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
        dependencyManager.installDependencies = Sinon.stub().rejects();

        // act
        let actual = dependencyManager.syncDependencyVersions(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).not.to.have.been.called;
        });
      });

    it("should call helper.updateDependencyVersions with callback that prompts user and calls reject on 'No' when prompt is true", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action(null, "false"));
        dependencyManager.installDependencies = Sinon.stub();

        // act
        let actual = dependencyManager.syncDependencyVersions(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).not.to.have.been.called;
        });
      });

    it("should call helper.updateDependencyVersions with callback that prompts user and calls reject error when prompt is true", () => {
        // arrange
        let config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
        mockRead.returns({});
        const mockAction = Sinon.stub();
        mockUpdateDependencyVersions.callsFake((addDir, elmJson, testDeps, extraDeps, callback) => {
          callback({"bar": "baz"}, mockAction);
        });
        mockConfirm.callsFake((message, defaults, action) => action("fail", "false"));
        dependencyManager.installDependencies = Sinon.stub();

        // act
        let actual = dependencyManager.syncDependencyVersions(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockAction).not.to.have.been.called;
          expect(dependencyManager.installDependencies).not.to.have.been.called;
        });
      });
  });

  describe("installDependencies", () => {
    it("should call runElmPackageInstall with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      let actual = dependencyManager.installDependencies(config, ["bar"]);

      // assert
      actual.then(() => {
        expect(dependencyManager.runElmPackageInstall).to.have.been
          .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call runElmPackageInstall with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      let actual = dependencyManager.installDependencies(config, ["bar"]);

      // assert
      actual.then(() => {
        expect(dependencyManager.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
      });
    });

    it("should call runElmPackageInstall with the supplied config.prompt", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", prompt: true};
      dependencyManager.runElmPackageInstall = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      let actual = dependencyManager.installDependencies(config, ["bar"]);

      // assert
      actual.then(() => {
        expect(dependencyManager.runElmPackageInstall).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true);
      });
    });
  });

  describe("runElmPackageInstall", () => {
    it("should call util.runElmCommand to init with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to install the packages with the supplied appDir", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call util.runElmCommand to init the app with the init action", () => {
      // arrange
      let config = <LoboConfig> {};

      // act
      dependencyManager.runElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/^init/));
    });

    it("should call resolve when there are no util.runElmCommand init errors", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmInit(config, false, mockResolve, mockReject);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should catch any util.runElmCommand init errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {};
      let expected = new Error();
      mockRunElmCommand.throws(expected);

      // act
      dependencyManager.runElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });
  });

  describe("runElmPackageInstall", () => {
    it("should not call util.runElmCommand to install the packages when config.noInstall is true", () => {
      // arrange
      let config = <LoboConfig> {noInstall: true};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).not.to.have.been.called;
    });

    it("should call util.runElmCommand to install the packages with the supplied config", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
    });

    it("should call util.runElmCommand to install the packages with the supplied appDir", () => {
      // arrange
      let config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, "foo", Sinon.match.any);
    });

    it("should call util.runElmCommand to install the packages with the install action", () => {
      // arrange
      let config = <LoboConfig> {};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockRunElmCommand).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, Sinon.match(/^install /));
    });

    it("should call resolve when there are no util.runElmCommand install errors", () => {
      // arrange
      let config = <LoboConfig> {compiler: "foo"};

      // act
      dependencyManager.runElmPackageInstall(config, "bar", false, mockResolve, mockReject);

      // assert
      expect(mockResolve).to.have.been.calledWith();
    });

    it("should catch any util.runElmCommand installation errors and call the specified reject with the error", () => {
      // arrange
      let config = <LoboConfig> {};
      let expected = new Error();
      mockRunElmCommand.throws(expected);

      // act
      dependencyManager.runElmPackageInstall(config, "bar", true, mockResolve, mockReject);

      // assert
      expect(mockReject).to.have.been.calledWith(expected);
    });
  });
});
