import {
  PluginTestFrameworkConfig,
  PluginOption,
  DependencyGroup, VersionSpecificationRangeValid
} from "../../lib/plugin";
import {makeVersion} from "../../lib/version";

export class ElmTestConfig implements PluginTestFrameworkConfig {

  public readonly name: string = "elm-test";
  public readonly sourceDirectories: string[] = ["runner", "plugin/elm-test"];
  public readonly dependencies: DependencyGroup<VersionSpecificationRangeValid>;

  public options: PluginOption[] = [
    {flags: "--seed <value>", description: "initial seed value for fuzz tests; defaults to a random value"},
    {flags: "--runCount <value>", description: "run count for fuzz tests; defaults to 100"}
  ];

  public constructor() {
    this.dependencies = {};
    this.dependencies["elm/core"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/json"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/random"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/time"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm-explorations/test"] = this.createDependency( 1, 2, 0, true, false, 2, 0, 0);
  }

  public createDependency(minMajor: number, minMinor: number, minPatch: number, canEqualMin: boolean, canEqualMax: boolean,
                          maxMajor: number, maxMinor: number, maxPatch: number): VersionSpecificationRangeValid {
    const maxVersion = makeVersion(maxMajor, maxMinor, maxPatch);
    const minVersion = makeVersion(minMajor, minMinor, minPatch);
    return {canEqualMax, canEqualMin, maxVersion, minVersion, type: "range"};
  }
}

const config = new ElmTestConfig();

export {config as PluginConfig};
