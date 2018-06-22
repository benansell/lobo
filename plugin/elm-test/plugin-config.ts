import {Dependencies, PluginTestFrameworkConfig, PluginOption, VersionSpecificationPackage} from "../../lib/plugin";
import {makeVersion} from "../../lib/version";

export class ElmTestConfig implements PluginTestFrameworkConfig {

  public readonly name: string = "elm-test";
  public readonly sourceDirectories: string[] = ["runner", "plugin/elm-test"];
  public readonly dependencies: Dependencies<VersionSpecificationPackage>;

  public options: PluginOption[] = [
    {flags: "--seed <value>", description: "initial seed value for fuzz tests; defaults to a random value"},
    {flags: "--runCount <value>", description: "run count for fuzz tests; defaults to 100"}
  ];

  public constructor() {
    this.dependencies = {};
    this.dependencies["elm-explorations/test"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/random"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/time"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
  }

  public createDependency(minMajor: number, minMinor: number, minPatch: number, canEqualMin: boolean, canEqualMax: boolean,
                          maxMajor: number, maxMinor: number, maxPatch: number): VersionSpecificationPackage {
    const maxVersion = makeVersion(maxMajor, maxMinor, maxPatch);
    const minVersion = makeVersion(minMajor, minMinor, minPatch);
    return {canEqualMax, canEqualMin, maxVersion, minVersion, type: "package"};
  }
}

let config = new ElmTestConfig();

export {config as PluginConfig};
