import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

import {createLogger, Logger} from "./logger";
import {createUtil, Util} from "./util";
import {PluginTestFrameworkWithConfig} from "./plugin";

export interface Dependencies {
  [index: string]: string;
}

export interface ElmPackageJson {
  dependencies: Dependencies;
  sourceDirectories: string[];
}

export type UpdateCallback<T> = (diff: T, updateAction: () => ElmPackageJson) => void;

export interface ElmPackageHelper {
  path(elmPackageJsonDirectory: string): string;
  read(elmPackageJsonDirectory: string): ElmPackageJson | undefined;
  updateDependencies(testFramework: PluginTestFrameworkWithConfig, baseElmPackage: ElmPackageJson,
                     testElmPackageDir: string, testElmPackage: ElmPackageJson, callback: UpdateCallback<string[][]>): void;
  updateSourceDirectories(baseElmPackageDir: string, baseElmPackage: ElmPackageJson, testElmPackageDir: string, testDir: string,
                          testElmPackage: ElmPackageJson, extraDirectories: string[], callback: UpdateCallback<string[]>): void;
}

export class ElmPackageHelperImp implements ElmPackageHelper {

  private logger: Logger;
  private util: Util;

  constructor(logger: Logger, util: Util) {
    this.logger = logger;
    this.util = util;
  }

  public addSourceDirectories(additions: string[], additionDir: string, testElmPackageDir: string, sourceDirs: string[]): string[] {
    if (!additions) {
      return sourceDirs;
    }

    let relativePath = path.relative(testElmPackageDir, additionDir);
    let absoluteSourceDirs = _.map(sourceDirs, p => this.util.resolveDir(testElmPackageDir, p));

    let relativeSourceDirectories =
      _.map(additions, p => path.join(relativePath, p)
        .replace(/\\/g, "/"))
        .filter(p => absoluteSourceDirs.indexOf(this.util.resolveDir(testElmPackageDir, p)) === -1);

    return sourceDirs.concat(relativeSourceDirectories);
  }

  public isImprovedMinimumConstraint(dependency: string, candidate: string): boolean {
    if (dependency === candidate) {
      return false;
    }

    let versionRegex = /^(\d)\.(\d)\.(\d)/;
    let dependencyLowerBound = versionRegex.exec(dependency);
    let candidateLowerBound = versionRegex.exec(candidate);

    if (!dependencyLowerBound || dependencyLowerBound.length !== 4 || !candidateLowerBound || candidateLowerBound.length !== 4) {
      return false;
    }

    return dependencyLowerBound[1] < candidateLowerBound[1]
      || dependencyLowerBound[2] < candidateLowerBound[2]
      || dependencyLowerBound[3] < candidateLowerBound[3];
  }

  public isNotExistingDependency(dependencies: string[][], candidate: string[]): boolean {
    return !_.find(dependencies, x => {
      return x[0] === candidate[0] && !this.isImprovedMinimumConstraint(x[1], candidate[1]);
    });
  }

  public mergeDependencies(baseElmPackage: ElmPackageJson, testElmPackage: ElmPackageJson, testFramework: PluginTestFrameworkWithConfig)
    : string[][] {
    let dependencies: string[][] = _.toPairs(testElmPackage.dependencies);

    if (baseElmPackage.dependencies) {
      let baseDependencies: string[][] = _.toPairs(baseElmPackage.dependencies)
        .filter((base: string[]) => this.isNotExistingDependency(dependencies, base));

      dependencies = dependencies.concat(baseDependencies);
    }

    if (testFramework.config.dependencies) {
      let testFrameworkDependencies = _.toPairs(testFramework.config.dependencies)
        .filter((base) => this.isNotExistingDependency(dependencies, base));

      dependencies = dependencies.concat(testFrameworkDependencies);
    }

    return dependencies;
  }

  public mergeSourceDirectories(baseElmPackage: ElmPackageJson, baseElmPackageDir: string, testElmPackage: ElmPackageJson,
                                testElmPackageDir: string, testDir: string, extraDirectories: string[]): string[] {
    let sourceDirs: string[] = _.clone(testElmPackage.sourceDirectories);

    if (!sourceDirs) {
      sourceDirs = [];
    }

    if (sourceDirs.indexOf(".") === -1) {
      sourceDirs.push(".");
    }

    if (sourceDirs.indexOf(testDir) === -1) {
      sourceDirs.push(testDir);
    }

    sourceDirs = this.addSourceDirectories(baseElmPackage.sourceDirectories, baseElmPackageDir, testElmPackageDir, sourceDirs);

    if (extraDirectories.length > 0) {
      let dirPath = path.join(__dirname, "..");
      sourceDirs = this.addSourceDirectories(extraDirectories, dirPath, testElmPackageDir, sourceDirs);
    }

    return sourceDirs;
  }

  public path(elmPackageJsonDirectory: string): string {
    return path.join(elmPackageJsonDirectory, "elm-package.json");
  }

  public read(elmPackageJsonDirectory: string): ElmPackageJson | undefined {
    try {
      let packagePath = this.path(elmPackageJsonDirectory);
      let raw = this.util.read(packagePath);

      if (!raw) {
        return undefined;
      }

      let json = JSON.parse(raw.toString());
      json.sourceDirectories = json["source-directories"];
      delete json["source-directories"];

      return json;
    } catch (err) {
      this.logger.debug(err);
      return undefined;
    }
  }

  public updateDependencies(testFramework: PluginTestFrameworkWithConfig, baseElmPackage: ElmPackageJson,
                            testElmPackageDir: string, testElmPackage: ElmPackageJson, callback: UpdateCallback<string[][]>): void {
      let dependencies = this.mergeDependencies(baseElmPackage, testElmPackage, testFramework);
      let existing = _.toPairs(testElmPackage.dependencies);
      let diff = _.filter(dependencies, base => this.isNotExistingDependency(existing, base));
      callback(diff, ()  => this.updateDependenciesAction(dependencies, testElmPackageDir, testElmPackage));
  }

  public updateDependenciesAction(dependencies: string[][], testElmPackageDir: string, testElmPackage: ElmPackageJson): ElmPackageJson {
    let sortedDependencies: string[][] = _.sortBy(dependencies, (kp: string[]) => kp[0]);
    testElmPackage.dependencies = _.fromPairs(sortedDependencies);
    this.write(testElmPackageDir, testElmPackage);

    return testElmPackage;
  }

  public updateSourceDirectories(baseElmPackageDir: string, baseElmPackage: ElmPackageJson, testElmPackageDir: string, testDir: string,
                                 testElmPackage: ElmPackageJson, extraDirectories: string[], callback: UpdateCallback<string[]>): void {
      let sourceDirectories = this.mergeSourceDirectories(baseElmPackage, baseElmPackageDir, testElmPackage, testElmPackageDir, testDir,
                                                          extraDirectories);
      let diff = _.difference(sourceDirectories, testElmPackage.sourceDirectories);
      callback(diff, ()  => this.updateSourceDirectoriesAction(sourceDirectories, testElmPackageDir, testElmPackage));
  }

  public updateSourceDirectoriesAction(sourceDirectories: string[], testElmPackageDir: string, testElmPackage: ElmPackageJson):
    ElmPackageJson {
    testElmPackage.sourceDirectories = sourceDirectories;
    this.write(testElmPackageDir, testElmPackage);

    return testElmPackage;
  }

  public write(elmPackageJsonDirectory: string, elmPackage: ElmPackageJson): void {
    let packagePath = this.path(elmPackageJsonDirectory);
    let data: object = _.clone(elmPackage);
    (<{[key: string]: string[]}>data)["source-directories"] = elmPackage.sourceDirectories;
    delete (<ElmPackageJson>data).sourceDirectories;
    fs.writeFileSync(packagePath, JSON.stringify(data, null, 4));
  }
}

export function createElmPackageHelper(): ElmPackageHelper {
  return new ElmPackageHelperImp(createLogger(), createUtil());
}
