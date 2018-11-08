"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {DependencyManager, DependencyManagerImp, createDependencyManager} from "../../../lib/dependency-manager";
import {DependencyGroup, ExecutionContext, LoboConfig, VersionSpecificationRangeValid} from "../../../lib/plugin";
import {Logger} from "../../../lib/logger";
import {ElmApplicationJson, ElmJson, ElmPackageHelper, ElmPackageJson} from "../../../lib/elm-package-helper";
import {Util} from "../../../lib/util";
import {ElmCommandRunner} from "../../../lib/elm-command-runner";
import Bluebird = require("bluebird");

const expect = chai.expect;
chai.use(SinonChai);
chai.use(require("chai-things"));

describe("lib dependency-manager", () => {
  let RewiredDependencyManager = rewire("../../../lib/dependency-manager");
  let dependencyManager: DependencyManagerImp;
  let mockClean: Sinon.SinonStub;
  let mockConfirm: Sinon.SinonStub;
  let mockExists: Sinon.SinonStub;
  let mockHelper: ElmPackageHelper;
  let mockInit: Sinon.SinonStub;
  let mockLogger: Logger;
  let mockReadElmJson: Sinon.SinonStub;
  let mockUtil: Util;
  let mockLogStage: Sinon.SinonStub;
  let mockElmCommandRunner: ElmCommandRunner;
  let mockPathElmJson: Sinon.SinonStub;
  let mockPathLoboJson: Sinon.SinonStub;
  let mockUpdateDependencies: Sinon.SinonStub;
  let mockUpdateDependencyVersions: Sinon.SinonStub;
  let mockUpdateSourceDirectories: Sinon.SinonStub;
  let mockReject: (error: Error) => void;
  let mockResolve: () => void;
  let mockRmDir: Sinon.SinonStub;
  let mockShelljsCp: Sinon.SinonStub;
  let mockShelljsRm: Sinon.SinonStub;
  let mockShelljsTest: Sinon.SinonStub;
  let revert: () => void;

  beforeEach(() => {
    mockConfirm = Sinon.stub();
    mockExists = Sinon.stub();
    mockRmDir = Sinon.stub();
    mockShelljsCp = Sinon.stub();
    mockShelljsRm = Sinon.stub();
    mockShelljsTest = Sinon.stub();
    revert = RewiredDependencyManager.__set__({
      fs: { existsSync: mockExists, rmdirSync: mockRmDir},
      promptly: {confirm: mockConfirm},
      shelljs: {cp: mockShelljsCp, rm: mockShelljsRm, test: mockShelljsTest}
    });
    const rewiredImp = RewiredDependencyManager.__get__("DependencyManagerImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockLogger.error = Sinon.spy();
    mockLogger.info = Sinon.spy();
    mockLogger.trace = Sinon.spy();
    mockLogger.warn = Sinon.spy();
    mockReadElmJson = Sinon.stub();
    mockHelper = <ElmPackageHelper> {};
    mockClean = Sinon.stub();
    mockHelper.clean = mockClean;
    mockPathElmJson = Sinon.stub().callsFake(x => x);
    mockHelper.pathElmJson = mockPathElmJson;
    mockPathLoboJson = Sinon.stub().callsFake(x => x);
    mockHelper.pathLoboJson = mockPathLoboJson;
    mockHelper.tryReadElmJson = mockReadElmJson;
    mockUpdateDependencies = Sinon.stub();
    mockHelper.updateDependencies = mockUpdateDependencies;
    mockUpdateDependencyVersions = Sinon.stub();
    mockHelper.updateDependencyVersions = mockUpdateDependencyVersions;
    mockUpdateSourceDirectories = Sinon.stub();
    mockHelper.updateSourceDirectories = mockUpdateSourceDirectories;

    mockUtil = <Util> {};
    mockLogStage = Sinon.stub();
    mockUtil.logStage = mockLogStage;

    mockElmCommandRunner = <ElmCommandRunner> {};
    mockInit = Sinon.stub();
    mockElmCommandRunner.init = mockInit;

    dependencyManager = new rewiredImp(mockElmCommandRunner, mockHelper, mockLogger, mockUtil);

    mockReject = Sinon.spy();
    mockResolve = Sinon.spy();
  });

  afterEach(() => {
    revert();
  });

  describe("createDependencyManager", () => {
    it("should return dependencyManager", () => {
      // act
      const actual: DependencyManager = createDependencyManager();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("ensureAppElmJsonExists", () => {
    describe("shelljs test is true", () => {
      it("should do nothing when elm.json already exists", () => {
        // arrange
        const config = <LoboConfig> {prompt: false};
        mockShelljsTest.returns(true);

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.finally(() => {
          expect(actual.isResolved()).to.be.true;
        });
      });
    });

    describe("shelljs test is false", () => {
      it("should prompt the user before running elm package install when config.prompt is true", () => {
        // arrange
        const config = <LoboConfig> {prompt: true};
        mockShelljsTest.returns(false);
        mockElmCommandRunner.init = Sinon.spy();
        mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.catch(() => {
          expect(mockConfirm).to.have.been.called;
          expect(mockElmCommandRunner.init).not.to.have.been.called;
        });
      });

      it("should call runElmPackageInstall with appDirectory when config.prompt is true", () => {
        // arrange
        mockShelljsTest.returns(false);
        mockShelljsTest.returns(false);
        const config = <LoboConfig> {appDirectory: "foo", prompt: true};
        mockElmCommandRunner.init = Sinon.spy((conf, appDir, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.finally(() => {
          expect(mockElmCommandRunner.init).to.have.been
            .calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
        });
      });

      it("should not call runElmPackageInstall when config.prompt is true and error occurs", () => {
        // arrange
        const config = <LoboConfig> {prompt: true};
        mockShelljsTest.returns(false);
        mockElmCommandRunner.init = Sinon.spy();
        mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.catch(() => {
          expect(mockElmCommandRunner.init).not.to.have.been.called;
        });
      });

      it("should not call runElmPackageInstall when config.prompt is true and user answers false", () => {
        // arrange
        const config = <LoboConfig> {prompt: true};
        mockShelljsTest.returns(false);
        mockElmCommandRunner.init = Sinon.spy();
        mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.catch(() => {
          expect(mockElmCommandRunner.init).not.to.have.been.called;
        });
      });

      it("should call runElmPackageInstall with prompt false when config.prompt is false", () => {
        // arrange
        const config = <LoboConfig> {prompt: false};
        mockShelljsTest.returns(false);
        mockElmCommandRunner.init = Sinon.spy((conf, appDir, prompt, resolve) => resolve());

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.finally(() => {
          expect(mockElmCommandRunner.init).to.have.been
            .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any);
        });
      });

      it("should call runElmPackageInstall with prompt true when config.prompt is true", () => {
        // arrange
        const config = <LoboConfig> {prompt: true};
        mockShelljsTest.returns(false);
        mockElmCommandRunner.init = Sinon.spy((conf, appDir, prompt, resolve) => resolve());
        mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

        // act
        const actual = dependencyManager.ensureAppElmJsonExists(config);

        // assert
        return actual.finally(() => {
          expect(mockElmCommandRunner.init).to.have.been
            .calledWith(Sinon.match.any, Sinon.match.any, true, Sinon.match.any, Sinon.match.any);
        });
      });
    });
  });

  describe("ensureLoboElmJsonExists", () => {
    it("should remove loboDir elm.json if it already exists", () => {
      // arrange
      const config = <LoboConfig> {prompt: false};
      mockPathElmJson.returns("foo");
      mockExists.returns(true);

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.finally(() => {
        expect(mockShelljsRm).to.have.been.calledWith("foo");
      });
    });

    it("should copy lobo.json to loboDir elm.json if lobo.json exists", () => {
      // arrange
      const config = <LoboConfig> {prompt: false};
      mockPathElmJson.returns("foo");
      mockPathLoboJson.returns("bar");
      mockExists.returns(true);

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.finally(() => {
        expect(mockShelljsCp).to.have.been.calledWith("bar", "foo");
      });
    });

    it("should prompt the user before running elm package install when config.prompt is true", () => {
      // arrange
      const config = <LoboConfig> {prompt: true};
      mockShelljsTest.returns(false);
      mockElmCommandRunner.init = Sinon.spy();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockElmCommandRunner.init).not.to.have.been.called;
      });
    });

    it("should call runLoboElmInit with config when config.prompt is true", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", prompt: true};
      mockShelljsTest.returns(false);
      dependencyManager.runLoboElmInit = Sinon.stub().callsFake((c, p, resolve) => resolve());
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.then(() => {
        expect(dependencyManager.runLoboElmInit).to.have.been
          .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should not call runLoboElmInit when config.prompt is true and error occurs", () => {
      // arrange
      const config = <LoboConfig> {prompt: true};
      mockShelljsTest.returns(false);
      dependencyManager.runLoboElmInit = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action({}, "foo"));

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.runLoboElmInit).not.to.have.been.called;
      });
    });

    it("should not call runLoboElmInit when config.prompt is true and user answers false", () => {
      // arrange
      const config = <LoboConfig> {prompt: true};
      mockShelljsTest.returns(false);
      dependencyManager.runLoboElmInit = Sinon.stub();
      mockConfirm.callsFake((message, defaults, action) => action(undefined, false));

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.runLoboElmInit).not.to.have.been.called;
      });
    });

    it("should call runLoboElmInit with prompt false when config.prompt is false", () => {
      // arrange
      const config = <LoboConfig> {prompt: false};
      mockShelljsTest.returns(false);
      dependencyManager.runLoboElmInit = Sinon.stub().callsFake((c, p, resolve) => resolve());

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.then(() => {
        expect(dependencyManager.runLoboElmInit).to.have.been
          .calledWith(Sinon.match.any, false, Sinon.match.any);
      });
    });

    it("should call runLoboElmInit with prompt true when config.prompt is true", () => {
      // arrange
      const config = <LoboConfig> {prompt: true};
      mockShelljsTest.returns(false);
      dependencyManager.runLoboElmInit = Sinon.stub().callsFake((c, p, resolve) => resolve());
      mockConfirm.callsFake((message, defaults, action) => action(undefined, true));

      // act
      const actual = dependencyManager.ensureLoboElmJsonExists(config);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.runLoboElmInit).to.have.been
          .calledWith(Sinon.match.any, true, Sinon.match.any, Sinon.match.any);
      });
    });
  });

  describe("installDependencies", () => {
    it("should not call elmCommandRunner.install when noInstall is true", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", noInstall: true};
      mockElmCommandRunner.install = Sinon.stub();

      // act
      const actual = dependencyManager.installDependencies(config, false, ["bar"]);

      // assert
      actual.then(() => {
        expect(mockElmCommandRunner.install).not.to.have.been.called;
      });
    });

    it("should log ignored installs when noInstall is true", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", noInstall: true};
      mockElmCommandRunner.install = Sinon.stub();

      // act
      const actual = dependencyManager.installDependencies(config, false, ["bar", "baz"]);

      // assert
      actual.then(() => {
        expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/ 'bar' /));
        expect(mockLogger.info).to.have.been.calledWith(Sinon.match(/ 'baz' /));
      });
    });

    it("should call elmCommandRunner.install with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      mockElmCommandRunner.install = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      const actual = dependencyManager.installDependencies(config, false, ["bar"]);

      // assert
      actual.then(() => {
        expect(mockElmCommandRunner.install).to.have.been
          .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmCommandRunner.install with the supplied packageNames", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      mockElmCommandRunner.install = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      const actual = dependencyManager.installDependencies(config, false, ["bar", "baz"]);

      // assert
      actual.then(() => {
        expect(mockElmCommandRunner.install).to.have.been.calledWith(Sinon.match.any, "bar", Sinon.match.any);
        expect(mockElmCommandRunner.install).to.have.been.calledWith(Sinon.match.any, "baz", Sinon.match.any);
      });
    });

    it("should call elmCommandRunner.install with the supplied config.prompt", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", prompt: true};
      mockElmCommandRunner.install = Sinon.spy((conf, testDir, prompt, resolve) => resolve());

      // act
      const actual = dependencyManager.installDependencies(config, true, ["bar"]);

      // assert
      actual.then(() => {
        expect(mockElmCommandRunner.install).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, true);
      });
    });
  });

  describe("readElmJson", () => {
    it("should call elmPackageHelper.read with the supplied appDirectory", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      mockReadElmJson.returns({});

      // act
      const actual = dependencyManager.readElmJson(config);

      // assert
      actual.then(() => {
        expect(mockReadElmJson).to.have.been.calledWith("foo");
      });
    });

    it("should resolve with the elmJson returned from elmPackageHelper.read", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      const expected = {type: "application"};
      mockReadElmJson.returns(expected);

      // act
      const actual = dependencyManager.readElmJson(config);

      // assert
      actual.then((result) => {
        expect(result).to.equal(expected);
      });
    });

    it("should call reject and log error when elmPackageHelper.read returns undefined", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};
      mockReadElmJson.returns(undefined);

      // act
      const actual = dependencyManager.readElmJson(config);

      // assert
      actual.catch(() => {
        expect(mockLogger.error).to.have.been.called;
      });
    });
  });

  describe("runLoboElmInit", () => {
    it("should call elmCommandRunner.init with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runLoboElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockElmCommandRunner.init).to.have.been
        .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call elmCommandRunner.init with the supplied config.loboDirectory", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", loboDirectory: "bar"};

      // act
      dependencyManager.runLoboElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockElmCommandRunner.init).to.have.been
        .calledWith(Sinon.match.any, "bar", Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call elmCommandRunner.init with the supplied prompt", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runLoboElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockElmCommandRunner.init).to.have.been
        .calledWith(Sinon.match.any, Sinon.match.any, true, Sinon.match.any, Sinon.match.any);
    });

    it("should call elmCommandRunner.init with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo"};

      // act
      dependencyManager.runLoboElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockElmCommandRunner.init).to.have.been
        .calledWith(config, Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
    });

    it("should call elmCommandRunner.init with callback that calls elmPackageHelper.clean", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", loboDirectory: "bar"};
      mockInit.callsFake((c, ld, p, cb) => cb());

      // act
      dependencyManager.runLoboElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockHelper.clean).to.have.been.calledWith("bar");
    });

    it("should call elmCommandRunner.init with callback that calls reject on error", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", loboDirectory: "bar"};
      mockClean.throws("qux");
      mockInit.callsFake((c, ld, p, cb) => cb());

      // act
      dependencyManager.runLoboElmInit(config, true, mockResolve, mockReject);

      // assert
      expect(mockReject).to.have.been.called;
    });
  });

  describe("sync", () => {
    it("should call ensureAppElmPackageExists with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.ensureLoboElmJsonExists = Sinon.stub();
      dependencyManager.syncUpdate = Sinon.stub();

      // act
      const actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureAppElmJsonExists).to.have.been.calledWith(config);
      });
    });

    it("should call ensureLoboElmJsonExists with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      const context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.ensureLoboElmJsonExists = Sinon.stub();
      dependencyManager.syncUpdate = Sinon.stub();

      // act
      const actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.ensureLoboElmJsonExists).to.have.been.calledWith(config);
      });
    });

    it("should call syncUpdate with the supplied config when noUpdate is false", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false, noUpdate: false};
      const context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.ensureLoboElmJsonExists = Sinon.stub();
      dependencyManager.syncUpdate = Sinon.stub();

      // act
      const actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncUpdate).to.have.been.calledWith(config);
      });
    });

    it("should not call syncUpdate when noUpdate is true", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false, noUpdate: true};
      const context = <ExecutionContext> {config, testDirectory: "foo"};
      dependencyManager.ensureAppElmJsonExists = Sinon.stub();
      dependencyManager.ensureLoboElmJsonExists = Sinon.stub();
      dependencyManager.syncUpdate = Sinon.stub();

      // act
      const actual = dependencyManager.sync(context);

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncUpdate).not.to.have.been.called;
      });
    });
  });

  describe("syncDependencies", () => {
    it("should call elmPackageHelper.updateDependencies with the config.loboDirectory", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback([]);
      });

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencies).to.have.been
          .calledWith(config.loboDirectory, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateDependencies with the test framework dependencies", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const expected = <DependencyGroup<VersionSpecificationRangeValid>> {"foo": <VersionSpecificationRangeValid> {type: "range"}};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {dependencies: expected}}};
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback([]);
      });

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencies).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateDependencies with callback that does not call installDependencies when no deps are missing",
       () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      dependencyManager.installDependencies = Sinon.stub();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback([]);
      });

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.installDependencies).not.to.have.been.called;
      });
    });

    it("should call updateDependencies with callback that calls installDependencies when deps are missing and prompt is false", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: false};
      dependencyManager.installDependencies = Sinon.stub().resolves();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback(["bar"]);
      });

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(dependencyManager.installDependencies).to.have.been.called;
      });
    });

    it("should call updateDependencies with callback that calls reject on install error when deps are missing and prompt is false", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: false};
      dependencyManager.installDependencies = Sinon.stub().rejects();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback(["bar"]);
      });

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(dependencyManager.installDependencies).to.have.been.called;
      });
    });

    it("should call elmPackageHelper.updateDependencies with callback that prompts user when deps are missing and prompt is true", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback(["bar"]);
      });
      mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
      dependencyManager.installDependencies = Sinon.stub().resolves();

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
        expect(dependencyManager.installDependencies).to.have.been.calledWith(config, true, ["bar"]);
      });
    });

    it("should call elmPackageHelper.updateDependencies with callback that prompts user and calls reject on install deps error", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback(["bar"]);
      });
      mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
      dependencyManager.installDependencies = Sinon.stub().rejects();

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
      });
    });

    it("should call updateDependencies with callback that prompts user and calls reject on 'No' when prompt is true", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback(["bar"]);
      });
      mockConfirm.callsFake((message, defaults, action) => action(null, "false"));
      dependencyManager.installDependencies = Sinon.stub();

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
        expect(dependencyManager.installDependencies).not.to.have.been.called;
      });
    });

    it("should call elmPackageHelper.updateDependencies with callback that prompts user and calls reject error when prompt is true", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencies.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback(["bar"]);
      });
      mockConfirm.callsFake((message, defaults, action) => action("fail", "false"));
      dependencyManager.installDependencies = Sinon.stub().rejects();

      // act
      const actual = dependencyManager.syncDependencies(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
        expect(dependencyManager.installDependencies).not.to.have.been.called;
      });
    });
  });

  describe("syncDependencyVersions", () => {
    it("should call helper.updateDependencyVersions with the config.loboDirectory", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({});
      });

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(config.loboDirectory, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with the supplied elm.json", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({});
      });

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(Sinon.match.any, appElmJson, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with the test framework dependencies", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const expected = <DependencyGroup<VersionSpecificationRangeValid>> {"foo": <VersionSpecificationRangeValid> {type: "range"}};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {dependencies: expected}}};
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({});
      });

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockUpdateDependencyVersions).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, expected, Sinon.match.any);
      });
    });

    it("should call helper.updateDependencyVersions with callback that does not call update action when no deps are missing", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}};
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({}, mockAction);
      });

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockAction).not.to.have.been.called;
      });
    });

    it("should call updateDependencyVersions with callback that calls update action when deps are missing and prompt is false", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: false};
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({"bar": "baz"}, mockAction);
      });

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockAction).to.have.been.called;
      });
    });

    it("should call helper.updateDependencyVersions with callback that prompts user when deps are missing and prompt is true", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({"bar": "baz"}, mockAction);
      });
      mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
      dependencyManager.installDependencies = Sinon.stub().resolves();

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.finally(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).to.have.been.called;
      });
    });

    it("should call helper.updateDependencyVersions with callback that prompts user and calls reject on install deps error", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({"bar": "baz"}, mockAction);
      });
      mockConfirm.callsFake((message, defaults, action) => action(null, "true"));
      dependencyManager.installDependencies = Sinon.stub().rejects();

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
      });
    });

    it("should call helper.updateDependencyVersions with callback that prompts user and calls reject on 'No' when prompt is true", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({"bar": "baz"}, mockAction);
      });
      mockConfirm.callsFake((message, defaults, action) => action(null, "false"));
      dependencyManager.installDependencies = Sinon.stub();

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
      });
    });

    it("should call helper.updateDependencyVersions with callback that prompts user and calls reject error when prompt is true", () => {
      // arrange
      const appElmJson = <ElmApplicationJson>{};
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {}}, prompt: true};
      const mockAction = Sinon.stub();
      mockUpdateDependencyVersions.callsFake((loboDir, elmJson, testDeps, callback) => {
        callback({"bar": "baz"}, mockAction);
      });
      mockConfirm.callsFake((message, defaults, action) => action("fail", "false"));
      dependencyManager.installDependencies = Sinon.stub();

      // act
      const actual = dependencyManager.syncDependencyVersions(config, appElmJson);

      // assert
      return actual.catch(() => {
        expect(mockConfirm).to.have.been.called;
        expect(mockAction).not.to.have.been.called;
        expect(dependencyManager.installDependencies).not.to.have.been.called;
      });
    });
  });

  describe("syncSourceDirectories", () => {
    it("should call elmPackageHelper.updateSourceDirectories with the supplied loboDirectory", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: []}}};
      const appElmJson = <ElmApplicationJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateSourceDirectories).to.have.been
          .calledWith("foo", Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateSourceDirectories with the supplied appDirectory", () => {
      // arrange
      const config = <LoboConfig> {appDirectory: "foo", testFramework: {config: {sourceDirectories: []}}};
      const appElmJson = <ElmApplicationJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateSourceDirectories).to.have.been
          .calledWith(Sinon.match.any, "foo", Sinon.match.any, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateSourceDirectories with default source and test directories when package elm.json", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: []}}};
      const appElmJson = <ElmPackageJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return false; };

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateSourceDirectories).to.have.been
          .calledWith( Sinon.match.any, Sinon.match.any, Sinon.match.array.deepEquals(["baz", "src"]), Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateSourceDirectories with appSourceDirectories from application elm.json", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: []}}};
      const appElmJson = <ElmApplicationJson> { sourceDirectories: ["bar"]};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateSourceDirectories).to.have.been
          .calledWith( Sinon.match.any, Sinon.match.any, Sinon.match.array.deepEquals(["bar"]), Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateSourceDirectories with the test framework plugin source directories", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: ["bar"]}}};
      const appElmJson = <ElmApplicationJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateSourceDirectories).to.have.been
          .calledWith(Sinon.match.any, Sinon.match.any, Sinon.match.any, Sinon.match.array.deepEquals(["bar"]), Sinon.match.any);
      });
    });

    it("should call elmPackageHelper.updateSourceDirectories with callback that does nothing when diff is empty", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: ["baz"]}}};
      const appElmJson = <ElmApplicationJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };
      const mockUpdateAction = Sinon.stub();
      mockUpdateSourceDirectories.callsFake((ld, ad, asd, psd, cb) => {
        cb([], mockUpdateAction);
      });

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateAction).not.to.have.been.called;
      });
    });

    it("should call elmPackageHelper.updateSourceDirectories with callback that calls updateAction when diff is not empty", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: []}}};
      const appElmJson = <ElmApplicationJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };
      const mockUpdateAction = Sinon.stub();
      mockUpdateSourceDirectories.callsFake((ld, ad, asd, psd, cb) => {
        cb(["baz"], mockUpdateAction);
      });

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.then(() => {
        expect(mockUpdateAction).to.have.been.called;
      });
    });

    it("should catch errors when updateAction is called and call reject", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", testFramework: {config: {sourceDirectories: []}}};
      const appElmJson = <ElmApplicationJson> {};
      mockHelper.isApplicationJson = function(x: ElmJson): x is ElmApplicationJson { return true; };
      const expected = new Error("bar");
      const mockUpdateAction = Sinon.stub().throws(expected);
      mockUpdateSourceDirectories.callsFake((ld, ad, asd, psd, cb) => {
        cb(["baz"], mockUpdateAction);
      });

      // act
      const actual = dependencyManager.syncSourceDirectories(config, "baz", appElmJson);

      // assert
      actual.catch((err) => {
        expect(mockUpdateAction).to.have.been.called;
        expect(err).to.equal(expected);
      });
    });
  });

  describe("syncUpdate", () => {
    it("should call readElmJson with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve({})));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.readElmJson).to.have.been.calledWith(config);
      });
    });

    it("should throw an error when readElmJson returns undefined", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve(undefined)));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.catch((err) => {
        expect(err.toString()).to.equal("Error: Unable to read elm.json");
      });
    });

    it("should call syncSourceDirectories with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve({})));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncSourceDirectories).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should call syncSourceDirectories with the supplied test directory", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve({})));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncSourceDirectories).to.have.been.calledWith(config, "bar", Sinon.match.any);
      });
    });

    it("should call syncSourceDirectories with the elm.json returned by readElmJson", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      const expected = <ElmJson> {};
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve(expected)));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncSourceDirectories).to.have.been.calledWith(Sinon.match.any, Sinon.match.any, expected);
      });
    });

    it("should call syncDependencies with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve({})));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncDependencies).to.have.been.calledWith(config, Sinon.match.any);
      });
    });

    it("should call syncSourceDirectories with the elm.json returned by readElmJson", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      const expected = <ElmJson> {};
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve(expected)));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncDependencies).to.have.been.calledWith(Sinon.match.any, expected);
      });
    });

    it("should call updateLoboElmJson with the supplied config", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub();
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve({})));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.then(() => {
        expect(dependencyManager.syncSourceDirectories).to.have.been.calledWith(config, Sinon.match.any, Sinon.match.any);
      });
    });

    it("should catch any errors and throw", () => {
      // arrange
      const config = <LoboConfig> {noCleanup: false};
      dependencyManager.syncSourceDirectories = Sinon.stub();
      dependencyManager.syncDependencies = Sinon.stub().throws(new Error("foo"));
      dependencyManager.updateLoboElmJson = Sinon.stub();
      dependencyManager.readElmJson = Sinon.stub().returns(new Bluebird((resolve) => resolve({})));

      // act
      const actual = dependencyManager.syncUpdate(config, "bar");

      // assert
      return actual.catch((err) => {
        expect(err.toString()).to.equal("Error: foo");
      });
    });
  });

  describe("updateLoboElmJson", () => {
    it("should not copy lobo dir elm.json to lobo.json when noUpdate is true", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", noUpdate: true};
      const loboJson = <ElmJson> {};
      mockPathLoboJson.returns(loboJson);

      // act
      const actual = dependencyManager.updateLoboElmJson(config);

      // assert
      actual.then(() => {
        expect(mockShelljsCp).not.to.have.been.called;
      });
    });

    it("should call shelljs.cp with lobo dir elm.json to copy lobo dir elm.json to lobo.json when noUpdate is false", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", noUpdate: false};
      const elmJson = <ElmJson> {};
      mockPathElmJson.returns(elmJson);

      // act
      const actual = dependencyManager.updateLoboElmJson(config);

      // assert
      actual.then(() => {
        expect(mockShelljsCp).to.have.been.calledWith(elmJson, Sinon.match.any);
      });
    });

    it("should call shelljs.cp with lobo.json to copy lobo dir elm.json to lobo.json when noUpdate is false", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", noUpdate: false};
      const loboJson = <ElmJson> {};
      mockPathLoboJson.returns(loboJson);

      // act
      const actual = dependencyManager.updateLoboElmJson(config);

      // assert
      actual.then(() => {
        expect(mockShelljsCp).to.have.been.calledWith(Sinon.match.any, loboJson);
      });
    });

    it("should catch any errors and call reject when copying lobo dir elm.json to lobo.json", () => {
      // arrange
      const config = <LoboConfig> {loboDirectory: "foo", noUpdate: false};
      mockShelljsCp.throws("bar");

      // act
      const actual = dependencyManager.updateLoboElmJson(config);

      // assert
      actual.catch(() => {
        expect(mockLogger.error).to.have.been.called;
      });
    });
  });
});
