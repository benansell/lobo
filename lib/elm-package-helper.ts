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
  VersionSpecificationExactValid
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

export type UpdateDependenciesCallback = (missingDependencies: string[]) => void;

export type UpdateDependencyVersionsCallback
  = (improvedDependencies: DependencyGroup<VersionSpecification>, updateAction: () => void) => void;

export type UpdateSourceDirectoriesCallback = (missingDirectories: string[], updateAction: () => void) => void;

export interface ElmPackageHelper {
  clean(loboDir: string): void;
  isApplicationJson(elmJson: ElmJson): elmJson is ElmApplicationJson;
  pathElmJson(elmJsonDirectory: string): string;
  pathLoboJson(loboJsonDirectory: string): string;
  tryReadElmJson<T extends ElmJson>(elmJsonDir: string): T | undefined;
  readLoboElmJson(loboDir: string): ElmApplicationJson;
  readLoboJson(loboJsonDir: string): ElmApplicationJson;
  updateDependencies(loboDir: string, appElmJson: ElmJson, testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                     callback: UpdateDependenciesCallback): void;
  updateDependencyVersions(loboDir: string, appElmJson: ElmJson, testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                           callback: UpdateDependencyVersionsCallback): void;
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

    const relativePath = path.relative(loboDir, additionDir);
    const absoluteSourceDirs = _.map(sourceDirs, p => this.util.resolveDir(loboDir, p));

    const relativeSourceDirectories =
      _.map(additions, p => path.join(relativePath, p)
        .replace(/\\/g, "/"))
        .filter(p => absoluteSourceDirs.indexOf(this.util.resolveDir(loboDir, p)) === -1);

    return sourceDirs.concat(relativeSourceDirectories);
  }

  public clean(loboDir: string): void {
    const loboElmJsonPath = this.pathElmJson(loboDir);
    const elmJson = this.tryRead<ElmApplicationJson>(loboElmJsonPath);

    if (elmJson) {
      elmJson.sourceDirectories = [];
      elmJson.sourceDependencies.direct = {};
      elmJson.sourceDependencies.indirect = {};
      elmJson.testDependencies.direct = {};
      elmJson.testDependencies.indirect = {};
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

  public convertToAppDependency(versionSpecification: VersionSpecification): VersionSpecificationExact {
    if (this.isExactVersionSpec(versionSpecification)) {
      return versionSpecification;
    }

    if (this.isInvalidSpec(versionSpecification)) {
      return versionSpecification;
    }

    return <VersionSpecificationExactValid> {type: "exact", version: versionSpecification.minVersion};
  }

  public convertToRawDependencies(dependencies: Dependencies): RawDependencies {
    if (!dependencies) {
      return {};
    }

    if (this.isApplicationDependencies(dependencies)) {
      const result = <RawApplicationDependencies> {};
      result.direct = this.convertToRawDependencyGroup(dependencies.direct);
      result.indirect = this.convertToRawDependencyGroup(dependencies.indirect);

      return result;
    }

    return this.convertToRawDependencyGroup(<DependencyGroup<VersionSpecification>> dependencies);
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

  public findExistingLoboDependencies(loboElmJson: ElmApplicationJson): DependencyGroup<VersionSpecification> {
    const directSourceExists = loboElmJson.sourceDependencies && loboElmJson.sourceDependencies.direct;
    const directTestExists = loboElmJson.testDependencies && loboElmJson.testDependencies.direct;

    if (!directSourceExists && !directTestExists) {
      return {};
    }

    if (!directSourceExists) {
      return {...loboElmJson.testDependencies.direct};
    }

    if (!directTestExists) {
      return {...loboElmJson.sourceDependencies.direct};
    }

    return {...loboElmJson.sourceDependencies.direct, ...loboElmJson.testDependencies.direct};
  }

  public findImprovedDependencies<T extends VersionSpecification>(current: DependencyGroup<VersionSpecification>,
                                                                  dependencies: DependencyGroup<T>,
                                                                  improved: DependencyGroup<VersionSpecification> = {})
    : DependencyGroup<VersionSpecification> {
    const result = _.cloneDeep(improved);

    for (const d in dependencies) {
      if (dependencies.hasOwnProperty(d)) {
        if (this.isImprovedMinimumConstraint(current[d], dependencies[d])
          && this.isImprovedMinimumConstraint(result[d], dependencies[d])) {
          result[d] = dependencies[d];
        }
      }
    }

    return result;
  }

  public findMissingDependencies<T extends VersionSpecification>(existing: DependencyGroup<VersionSpecification>,
                                                                 dependencies: DependencyGroup<T>): string[] {
    const missing: string[] = [];

    for (const d in dependencies) {
      if (dependencies.hasOwnProperty(d)) {
        if (existing[d] === undefined && missing.indexOf(d) === -1) {
          missing.push(d);
        }
      }
    }

    return missing;
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
    } else {
      return false;
    }

    let canVersion: Version | undefined;

    if (this.isInvalidSpec(candidate)) {
      depVersion = undefined;
    } else if (this.isExactVersionSpec(candidate)) {
      canVersion = candidate.version;
    } else if (this.isRangeVersionSpec(candidate)) {
      canVersion = candidate.minVersion;
    } else {
      return false;
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

    sourceDirs = this.addSourceDirectories(loboElmJsonDir, sourceDirs, applicationDir, appSourceDirectories);

    if (extraDirectories.length > 0) {
      const dirPath = path.join(__dirname, "..");
      sourceDirs = this.addSourceDirectories(loboElmJsonDir, sourceDirs, dirPath, extraDirectories);
    }

    return sourceDirs;
  }

  public pathElmJson(elmJsonDirectory: string): string {
    return path.resolve(elmJsonDirectory, "elm.json");
  }

  public pathLoboJson(loboJsonDirectory: string): string {
    return path.resolve(loboJsonDirectory, "lobo.json");
  }

  public readLoboElmJson(loboDir: string): ElmApplicationJson {
    const loboElmJsonPath = this.pathElmJson(loboDir);
    const loboElmJson = this.tryRead<ElmApplicationJson>(loboElmJsonPath);

    if (!loboElmJson) {
      throw new Error("Unable to read the .lobo/elm.json file. Please check that is a valid json file");
    }

    return loboElmJson;
  }

  public readLoboJson(loboJsonDir: string): ElmApplicationJson {
    const elmJsonPath = this.pathLoboJson(loboJsonDir);
    const elmJson = this.tryRead<ElmApplicationJson>(elmJsonPath);

    if (!elmJson) {
      throw new Error("Unable to read the lobo.json file. Please check that is a valid json file");
    }

    return elmJson;
  }

  public tryRead<T extends ElmJson>(elmJsonPath: string): T | undefined {
    try {
      const raw = this.util.read(elmJsonPath);

      if (!raw) {
        return undefined;
      }

      const elmJson = <T & RawElmJson> JSON.parse(raw.toString());

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

  public tryReadElmJson<T extends ElmJson>(elmJsonDir: string): T | undefined {
    const elmJsonPath = this.pathElmJson(elmJsonDir);

    return this.tryRead<T>(elmJsonPath);
  }

  public updateDependencies(loboDir: string, appElmJson: ElmJson, testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                            callback: UpdateDependenciesCallback): void {
    const loboElmJson = this.readLoboElmJson(loboDir);
    const existingDependencies = this.findExistingLoboDependencies(loboElmJson);

    if (this.isApplicationJson(appElmJson)) {
      this.updateApplicationDependencies(existingDependencies, appElmJson, testDependencies, callback);
    } else {
      this.updatePackageDependencies(existingDependencies, appElmJson, testDependencies, callback);
    }
  }

  public updateApplicationDependencies(existingDependencies: DependencyGroup<VersionSpecification>, appElmJson: ElmApplicationJson,
                                       testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                                       callback: UpdateDependenciesCallback): void {
    const missingSourceDependencies = this.findMissingDependencies(existingDependencies, appElmJson.sourceDependencies.direct);
    const missingTestDependencies = this.findMissingDependencies(existingDependencies, appElmJson.testDependencies.direct);
    const missingTestFrameworkDependencies = this.findMissingDependencies(existingDependencies, testDependencies);

    const missing = _.union(missingSourceDependencies, missingTestDependencies, missingTestFrameworkDependencies);
    callback(missing);
  }

  public updatePackageDependencies(existingDependencies: DependencyGroup<VersionSpecification>, elmPackageJson: ElmPackageJson,
                                   testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                                   callback: UpdateDependenciesCallback): void {
    const missingSourceDependencies = this.findMissingDependencies(existingDependencies, elmPackageJson.sourceDependencies);
    const missingTestDependencies = this.findMissingDependencies(existingDependencies, elmPackageJson.testDependencies);
    const missingTestFrameworkDependencies = this.findMissingDependencies(existingDependencies, testDependencies);

    const missing = _.union(missingSourceDependencies, missingTestDependencies, missingTestFrameworkDependencies);
    callback(missing);
  }

  public updateDependencyVersions(loboDir: string, elmJson: ElmJson, testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                                  callback: UpdateDependencyVersionsCallback): void {
    const loboElmJson = this.readLoboElmJson(loboDir);
    const existingDependencies = this.findExistingLoboDependencies(loboElmJson);

    if (this.isApplicationJson(elmJson)) {
      this.updateApplicationDependencyVersions(loboDir, loboElmJson, existingDependencies, elmJson, testDependencies, callback);
    } else {
      this.updatePackageDependencyVersions(loboDir, loboElmJson, existingDependencies, elmJson, testDependencies, callback);
    }
  }

  public updateApplicationDependencyVersions(loboDir: string,
                                             loboElmJson: ElmApplicationJson,
                                             existingDependencies: DependencyGroup<VersionSpecification>,
                                             appElmJson: ElmApplicationJson,
                                             testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                                             callback: UpdateDependencyVersionsCallback): void {
    let improved = this.findImprovedDependencies(existingDependencies, appElmJson.sourceDependencies.direct);
    improved = this.findImprovedDependencies(existingDependencies, appElmJson.testDependencies.direct, improved);
    improved = this.findImprovedDependencies(existingDependencies, testDependencies, improved);

    const updateAction = () => this.updateDependenciesAction(improved, loboDir, loboElmJson);
    callback(improved, updateAction);
  }

  public updatePackageDependencyVersions(loboDir: string,
                                         loboElmJson: ElmApplicationJson,
                                         existingDependencies: DependencyGroup<VersionSpecification>,
                                         appElmJson: ElmPackageJson,
                                         testDependencies: DependencyGroup<VersionSpecificationRangeValid>,
                                         callback: UpdateDependencyVersionsCallback): void {
    let improved = this.findImprovedDependencies(existingDependencies, appElmJson.sourceDependencies);
    improved = this.findImprovedDependencies(existingDependencies, appElmJson.testDependencies, improved);
    improved = this.findImprovedDependencies(existingDependencies, testDependencies, improved);

    const updateAction = () => this.updateDependenciesAction(improved, loboDir, loboElmJson);
    callback(improved, updateAction);
  }

  public updateDependenciesAction(improved: DependencyGroup<VersionSpecification>, loboDir: string, loboElmJson: ElmApplicationJson): void {
    for (const i in improved) {
      if (improved.hasOwnProperty(i)) {
        loboElmJson.sourceDependencies.direct[i] = this.convertToAppDependency(improved[i]);
        delete loboElmJson.sourceDependencies.indirect[i];
        delete loboElmJson.testDependencies.direct[i];
        delete loboElmJson.testDependencies.indirect[i];
      }
    }

    this.write(loboDir, loboElmJson);
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

  public write(elmJsonDirectory: string, elmJson: ElmJson): void {
    const packagePath = this.pathElmJson(elmJsonDirectory);
    const data = <ElmJson & RawElmJson>_.clone(elmJson);

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
