import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

import {createLogger, Logger} from "./logger";
import {createUtil, Util} from "./util";
import {
  DependencyGroup,
  ApplicationDependencies,
  Version,
  VersionSpecification,
  VersionSpecificationExact,
  VersionSpecificationInvalid,
  VersionSpecificationRange,
  PackageDependencies,
  Dependencies,
  VersionSpecificationRangeValid,
  VersionSpecificationExactValid,
  Resolve,
  Reject
} from "./plugin";
import {makeVersion} from "./version";

export type ElmJsonType = "application" | "package";

export interface ElmApplicationJson {
  elmVersion: VersionSpecificationExact;
  sourceDependencies: ApplicationDependencies;
  sourceDirectories: string[];
  testDependencies: ApplicationDependencies;
  type: ElmJsonType;
}

export interface ElmPackageJson {
  elmVersion: VersionSpecificationExact;
  sourceDependencies: PackageDependencies;
  testDependencies: PackageDependencies;
  type: ElmJsonType;
}

export type ElmJson = ElmApplicationJson | ElmPackageJson;

export type RawDependencies = RawApplicationDependencies | RawPackageDependencies;

export interface RawApplicationDependencies {
  direct: RawDependencyGroup;
  indirect: RawDependencyGroup;
}

export type RawPackageDependencies = RawDependencyGroup;

export interface RawDependencyGroup {
  [index: string]: string;
}

export interface RawElmJson {
  dependencies: RawDependencies;
  "elm-version": string;
  "source-directories": string[];
  "test-dependencies": RawDependencies;
  type: ElmJsonType;
}

export type UpdateDependenciesCallback = (diff: DependencyGroup<VersionSpecification>, resolve: Resolve<void>, reject: Reject) => void;

export type UpdateSourceDirectoriesCallback = (diff: string[], updateAction: () => void) => void;

export interface ElmPackageHelper {
  clean(loboDir: string): void;
  isApplicationJson(elmJson: ElmJson): elmJson is ElmApplicationJson;
  path(elmJsonDirectory: string): string;
  read<T extends ElmJson>(elmJsonDirectory: string): T | undefined;
  updateDependencies(loboDir: string, appElmJson: ElmJson, dependencies: Dependencies, callback: UpdateDependenciesCallback): void;
  updateDependencyVersions(loboDir: string, appElmJson: ElmJson, dependencies: Dependencies, callback: UpdateDependenciesCallback): void;
  updateSourceDirectories(loboDir: string, applicationDir: string, sourceDirectories: string[],
                          extraDirectories: string[], callback: UpdateSourceDirectoriesCallback): void;
}

export class ElmPackageHelperImp implements ElmPackageHelper {

  private logger: Logger;
  private util: Util;

  constructor(logger: Logger, util: Util) {
    this.logger = logger;
    this.util = util;
  }

  public addSourceDirectories(loboDir: string, sourceDirs: string[],  additionDir: string, additions: string[]): string[] {
    if (!additions) {
      return sourceDirs;
    }

    let relativePath = path.relative(loboDir, additionDir);
    let absoluteSourceDirs = _.map(sourceDirs, p => this.util.resolveDir(loboDir, p));

    let relativeSourceDirectories =
      _.map(additions, p => path.join(relativePath, p)
        .replace(/\\/g, "/"))
        .filter(p => absoluteSourceDirs.indexOf(this.util.resolveDir(loboDir, p)) === -1);

    return sourceDirs.concat(relativeSourceDirectories);
  }

  public clean(loboDir: string): void {
    const elmJson = this.read<ElmApplicationJson>(loboDir);

    if (elmJson) {
      elmJson.sourceDirectories = [];
      const originalSourceDependencies = elmJson.sourceDependencies;
      elmJson.sourceDependencies.direct = {};
      elmJson.sourceDependencies.direct["elm/core"] = originalSourceDependencies.direct["elm/core"];
      elmJson.sourceDependencies.indirect = {};
      this.write(loboDir, elmJson);
    }
  }

  public convertFromRawDependencies(dependencies: RawDependencies): Dependencies {
    if (!dependencies) {
      return {};
    }

    if (this.isRawApplicationDependencies(dependencies)) {
      const result = <ApplicationDependencies> {};
      result.direct = this.convertFromRawExactDependencyGroup(dependencies.direct);
      result.indirect = this.convertFromRawExactDependencyGroup(dependencies.indirect);

      return result;
    }

    return this.convertFromRawRangeDependencyGroup(<RawPackageDependencies>dependencies);
  }

  public convertFromRawExactDependencyGroup(dependencies: RawDependencyGroup): DependencyGroup<VersionSpecificationExact> {
    const result: DependencyGroup<VersionSpecificationExact> = {};
    const exactVersionSpecRegex = /^(\d)\.(\d)\.(\d)$/;

    for (const d in dependencies) {
      if (dependencies.hasOwnProperty(d)) {
        const dep = <string> dependencies[d];
        const appSpecMatches = exactVersionSpecRegex.exec(dep);

        if (appSpecMatches && appSpecMatches.length > 0) {
          const major = parseInt(appSpecMatches[1], 10);
          const minor = parseInt(appSpecMatches[2], 10);
          const patch = parseInt(appSpecMatches[3], 10);
          const version = makeVersion(major, minor, patch);
          result[d] = <VersionSpecificationExactValid> {type: "exact", version};
          continue;
        }

        result[d] = <VersionSpecificationInvalid> {type: "invalid", version: dep};
      }
    }

    return result;
  }

  public convertFromRawRangeDependencyGroup(dependencies: RawDependencyGroup): DependencyGroup<VersionSpecificationRange> {
    const result: DependencyGroup<VersionSpecificationRange> = {};
    const packageVersionSpecRegex = /^(\d)\.(\d)\.(\d)\s*(<|<=)\s*v\s*(<|<=)\s*(\d)\.(\d)\.(\d)$/;

    for (const d in dependencies) {
      if (dependencies.hasOwnProperty(d)) {
        const dep = <string> dependencies[d];
        const packageSpecMatches = packageVersionSpecRegex.exec(dep);

        if (packageSpecMatches && packageSpecMatches.length > 0) {
          const vs = <VersionSpecificationRangeValid> {type: "range"};
          const minMajor = parseInt(packageSpecMatches[1], 10);
          const minMinor = parseInt(packageSpecMatches[2], 10);
          const minPatch = parseInt(packageSpecMatches[3], 10);
          vs.canEqualMin = packageSpecMatches[4] === "<=";
          vs.canEqualMax = packageSpecMatches[5] === "<=";
          const maxMajor = parseInt(packageSpecMatches[6], 10);
          const maxMinor = parseInt(packageSpecMatches[7], 10);
          const maxPatch = parseInt(packageSpecMatches[8], 10);
          vs.minVersion = makeVersion(minMajor, minMinor, minPatch);
          vs.maxVersion = makeVersion(maxMajor, maxMinor, maxPatch);
          result[d] = vs;
          continue;
        }

        result[d] = <VersionSpecificationInvalid> {type: "invalid", version: dep};
      }
    }

    return result;
  }

  public convertToRawDependencies(dependencies: Dependencies)
    : RawDependencies {
    const result = <RawApplicationDependencies> {};

    if (this.isApplicationDependencies(dependencies)) {
      result.direct = this.convertToRawDependencyGroup(dependencies.direct);
      result.indirect = this.convertToRawDependencyGroup(dependencies.indirect);
    }

    return result;
  }

  public convertToRawDependencyGroup(dependencies: DependencyGroup<VersionSpecification>): RawDependencyGroup {
    const result: RawDependencyGroup = {};

    if (!dependencies) {
      return result;
    }

    for (const d in dependencies) {
      if (dependencies.hasOwnProperty(d)) {
        const dep = <VersionSpecification> dependencies[d];

        if (this.isExactVersionSpec(dep)) {
          result[d] = dep.version.toString();
        } else if (this.isRangeVersionSpec(dep)) {
          result[d] = `${dep.minVersion.toString()} ${dep.canEqualMin ? "<=" : "<"} v ` +
            `${dep.canEqualMax ? "<=" : "<"} ${dep.maxVersion.toString()}`;
        } else {
          result[d] = (<VersionSpecificationInvalid>dep).version.toString();
        }
      }
    }

    return this.util.sortObject(result);
  }

  public isApplicationDependencies(dependency: Dependencies): dependency is ApplicationDependencies {
    return (<ApplicationDependencies>dependency).direct !== undefined;
  }

  public isApplicationJson(elmJson: ElmJson): elmJson is ElmApplicationJson {
    return elmJson.type === "application";
  }

  public isExactVersionSpec(versionSpec: VersionSpecification): versionSpec is VersionSpecificationExact {
    return versionSpec.type === "exact";
  }

  public isInvalidSpec(versionSpec: VersionSpecification): versionSpec is VersionSpecificationInvalid {
    return versionSpec.type === "invalid";
  }

  public isRangeVersionSpec(versionSpec: VersionSpecification): versionSpec is VersionSpecificationRange {
    return versionSpec.type === "range";
  }

  public isRawApplicationDependencies(dependency: RawDependencies): dependency is RawApplicationDependencies {
    return (<RawApplicationDependencies>dependency).direct !== undefined;
  }

  public isImprovedMinimumConstraint(dependency: VersionSpecification, candidate: VersionSpecification): boolean {
    let depVersion: Version | undefined;

    if (this.isInvalidSpec(dependency)) {
      depVersion = undefined;
    } else if (this.isExactVersionSpec(dependency)) {
        depVersion = dependency.version;
    } else if (this.isRangeVersionSpec(dependency)) {
        depVersion = dependency.minVersion;
    }

    let canVersion: Version | undefined;

    if (this.isInvalidSpec(candidate)) {
      depVersion = undefined;
    } else if (this.isExactVersionSpec(candidate)) {
      canVersion = candidate.version;
    } else if (this.isRangeVersionSpec(candidate)) {
      canVersion = candidate.minVersion;
    }

    if (!canVersion) {
      return false;
    }

    if (!depVersion) {
      return true;
    }

    return depVersion.isLessThan(canVersion);
  }

  public mergeSourceDirectories(loboElmJsonDir: string, loboElmJson: ElmApplicationJson, applicationDir: string,
                                appSourceDirectories: string[], extraDirectories: string[]): string[] {
    let sourceDirs: string[] = _.clone(loboElmJson.sourceDirectories);

    if (!sourceDirs) {
      sourceDirs = [];
    }

    if (sourceDirs.indexOf(".") === -1) {
      sourceDirs.push(".");
    }

    sourceDirs = this.addSourceDirectories(loboElmJsonDir, sourceDirs, applicationDir, appSourceDirectories);

    if (extraDirectories.length > 0) {
      let dirPath = path.join(__dirname, "..");
      sourceDirs = this.addSourceDirectories(loboElmJsonDir, sourceDirs, dirPath, extraDirectories);
    }

    return sourceDirs;
  }

  public path(elmPackageJsonDirectory: string): string {
    return path.join(elmPackageJsonDirectory, "elm.json");
  }

  public read<T extends ElmJson>(elmPackageJsonDirectory: string): T | undefined {
    try {
      let packagePath = this.path(elmPackageJsonDirectory);
      let raw = this.util.read(packagePath);

      if (!raw) {
        return undefined;
      }

      let elmJson = <T & RawElmJson> JSON.parse(raw.toString());

      if (this.isApplicationJson(elmJson)) {
        if (elmJson["source-directories"]) {
          elmJson.sourceDirectories = elmJson["source-directories"];
          delete elmJson["source-directories"];
        } else {
          elmJson.sourceDirectories = [];
        }
      }

      elmJson.sourceDependencies = this.convertFromRawDependencies(elmJson.dependencies);
      delete elmJson.dependencies;

      elmJson.testDependencies = this.convertFromRawDependencies(elmJson["test-dependencies"]);
      delete elmJson["test-dependencies"];

      return elmJson;
    } catch (err) {
      this.logger.debug(err);
      return undefined;
    }
  }

  public readLoboElmJson(loboDir: string): ElmApplicationJson {
    const loboElmJson = this.read<ElmApplicationJson>(loboDir);

    if (!loboElmJson) {
      throw "Unable to read the lobo.json file. Please check that is a valid json file";
    }

    return loboElmJson;
  }

  // needs seperate algo for application and package elmJsons that should update versions
  // at the same time..
  public updateDependencies(loboDir: string, appElmJson: ElmJson, testDependencies: Dependencies,
                            callback: UpdateDependenciesCallback): void {
    if (this.isApplicationJson(appElmJson)) {
      this.updateApplicationDependencies(elmJsonDir, appElmJson, dependencies, testDependencies, callback);
    } else {
      this.updatePackageDependencies(elmJsonDir, <ElmPackageJson> appElmJson, dependencies, testDependencies, callback);
    }
  }

  public updateApplicationDependencies(loboDir: string, appElmJson: ElmApplicationJson, dependencies: Dependencies,
                                       testDependencies: Dependencies, callback: UpdateDependenciesCallback): void {
    const updatedAppDependencies = <ApplicationDependencies> _.cloneDeep(appElmJson.sourceDependencies);
    const updatedTestDependencies = <ApplicationDependencies> _.cloneDeep(appElmJson.testDependencies);
    const missingDirect = <DependencyGroup<VersionSpecification>> {};

    for (const d in dependencies.direct) {
      if (dependencies.direct.hasOwnProperty(d)) {
        const vs = <VersionSpecification> dependencies.direct[d];
        updatedAppDependencies.direct[d] = vs;

        if (!appElmJson.sourceDependencies.direct[d] && !appElmJson.sourceDependencies.indirect[d] &&
          !testDependencies.direct[d] && !testDependencies.indirect[d]) {
          //missingDirect[d] = vs;
        }
      }
    }

    for (const d in testDependencies.direct) {
      if (testDependencies.direct.hasOwnProperty(d)) {
        const vs = <VersionSpecification> testDependencies.direct[d];
        updatedTestDependencies.direct[d] = vs;

        if (!appElmJson.testDependencies.direct[d] && !appElmJson.testDependencies.indirect[d] &&
          !dependencies.direct[d] && !dependencies.indirect[d]) {
          //missingDirect[d] = vs;
        }
      }
    }

    callback(missingDirect, () => this.updateDependenciesAction(updatedAppDependencies, updatedTestDependencies, elmJsonDir, appElmJson));
  }

  public updatePackageDependencies(elmJsonDir: string, elmJson: ElmPackageJson, testDependencies: Dependencies, callback: UpdateDependenciesCallback): void {
    const updatedAppDependencies = <Dependencies> _.cloneDeep(elmJson.sourceDependencies);
    const updatedTestDependencies = <Dependencies> _.cloneDeep(elmJson.testDependencies);
    const missingDirect = <DependencyGroup<VersionSpecification>> {};
    const movedToDirect = <DependencyGroup<VersionSpecification>> {};
    const missingIndirect = <DependencyGroup<VersionSpecification>> {};

    for (const d in dependencies.direct) {
      if (dependencies.direct.hasOwnProperty(d)) {
        const vs = <VersionSpecification> dependencies.direct[d];
        updatedAppDependencies.direct[d] = vs;

        if (!elmJson.sourceDependencies.direct[d] && !elmJson.sourceDependencies.indirect[d] &&
          !testDependencies.direct[d] && !testDependencies.indirect[d]) {
         missingDirect[d] = vs;
        }
      }
    }

    for (const d in testDependencies.direct) {
      if (testDependencies.direct.hasOwnProperty(d)) {
        const vs = <VersionSpecification> testDependencies.direct[d];
        updatedTestDependencies.direct[d] = vs;

        if (!elmJson.testDependencies.direct[d] && !elmJson.testDependencies.indirect[d] &&
          !dependencies.direct[d] && !dependencies.indirect[d]) {
          missingDirect[d] = vs;
        }
      }
    }

    callback(missingDirect, () => this.updateDependenciesAction(updatedAppDependencies, updatedTestDependencies, elmJsonDir, elmJson));
  }

  public updateDependenciesAction(appDependencies: Dependencies,
                                  testDependencies: Dependencies,
                                  elmJsonDir: string, elmJson: ElmJson): ElmJson {
    elmJson.sourceDependencies = appDependencies;
    elmJson.testDependencies = testDependencies;
    this.write(elmJsonDir, elmJson);

    return elmJson;
  }

  /*
  if (isApplication) {
    result[d] = dep.version.toString();
  } else {
  const nextVersion = makeVersion(dep.version.major + 1, 0, 0);
  result[d] = `${dep.version.toString()} <= v < ${nextVersion.toString()}`;
}
} else if (this.isRangeVersionSpec(dep)) {
  if (isApplication) {
    result[d] = dep.minVersion.toString();
  } else {
    result[d] = `${dep.minVersion.toString()} ${dep.canEqualMin ? "<=" : "<"} v ` +
      `${dep.canEqualMax ? "<=" : "<"} ${dep.maxVersion.toString()}`;
  }
  */

  public updateDependencyVersions(loboDir: string, elmJson: ElmJson, dependencies: Dependencies,
                                  testDependencies: Dependencies, callback: UpdateDependenciesCallback): void {
    const updatedDependencies = <Dependencies> _.cloneDeep(elmJson.sourceDependencies);
    const updatedTestDependencies = <Dependencies> _.cloneDeep(elmJson.testDependencies);
    const improved = <DependencyGroup<VersionSpecification>> {};

    for (const d in dependencies.direct) {
      if (dependencies.direct.hasOwnProperty(d)) {
        const vs = <VersionSpecification> dependencies.direct[d];
        updatedDependencies.direct[d] = vs;

        if (elmJson.sourceDependencies.direct[d] && this.isImprovedMinimumConstraint(vs, dependencies.direct[d])) {
          improved[d] = vs;
        }
      }
    }

    for (const d in testDependencies.direct) {
      if (testDependencies.direct.hasOwnProperty(d)) {
        const vs = <VersionSpecification> testDependencies.direct[d];
        updatedTestDependencies.direct[d] = vs;

        if (elmJson.testDependencies.direct[d] && this.isImprovedMinimumConstraint(vs, testDependencies.direct[d])) {
          improved[d] = vs;
        }
      }
    }

    callback(improved, () => this.updateDependenciesAction(updatedDependencies, updatedTestDependencies, loboDir, elmJson));
  }

  public updateSourceDirectories(loboDir: string, applicationDir: string, appSourceDirectories: string[],
                                 pluginDirectories: string[], callback: UpdateSourceDirectoriesCallback): void {
    const loboElmJson = this.readLoboElmJson(loboDir);
    const updatedSourceDirectories = this.mergeSourceDirectories(loboDir, loboElmJson, applicationDir, appSourceDirectories,
                                                                 pluginDirectories);
    const diff = _.difference(updatedSourceDirectories, appSourceDirectories);
    callback(diff, ()  => this.updateSourceDirectoriesAction(updatedSourceDirectories, loboDir, loboElmJson));
  }

  public updateSourceDirectoriesAction(sourceDirectories: string[], loboDir: string, loboElmJson: ElmApplicationJson): ElmApplicationJson {
    loboElmJson.sourceDirectories = sourceDirectories;
    this.write(loboDir, loboElmJson);

    return loboElmJson;
  }

  public write(elmPackageJsonDirectory: string, elmJson: ElmJson): void {
    let packagePath = this.path(elmPackageJsonDirectory);

    let data = <ElmJson & RawElmJson>_.clone(elmJson);

    if (this.isApplicationJson(elmJson) && this.isApplicationJson(data)) {
      data["source-directories"] = elmJson.sourceDirectories;
      delete data.sourceDirectories;
    }

    data.dependencies = this.convertToRawDependencies(elmJson.sourceDependencies);
    delete data.sourceDependencies;

    data["test-dependencies"] = this.convertToRawDependencies(elmJson.testDependencies);
    delete data.testDependencies;

    fs.writeFileSync(packagePath, JSON.stringify(data, null, 4));
  }
}

export function createElmPackageHelper(): ElmPackageHelper {
  return new ElmPackageHelperImp(createLogger(), createUtil());
}
