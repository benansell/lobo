import {Dependencies, PluginTestFrameworkConfig, PluginOption, VersionSpecificationPackage} from "../../lib/plugin";
import {createVersion} from "../../lib/version";

export class ElmTestExtraConfig implements PluginTestFrameworkConfig {

  public readonly name: string = "elm-test-extra";
  public readonly sourceDirectories: string[] = ["runner", "plugin/elm-test-extra"];
  public readonly dependencies: Dependencies<VersionSpecificationPackage>;

  public readonly options: PluginOption[] = [
    {flags: "--seed <value>", description: "initial seed value for fuzz tests; defaults to a random value"},
    {flags: "--runCount <value>", description: "run count for fuzz tests; defaults to 100"}
  ];

  public constructor() {
    this.dependencies = {};
    this.dependencies["benansell/lobo-elm-test-extra"] = this.createDependency( 3, 0, 0, true, false, 4, 0, 0);
    this.dependencies["elm-explorations/test"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/random"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
    this.dependencies["elm/time"] = this.createDependency( 1, 0, 0, true, false, 2, 0, 0);
  }

  public createDependency(minMajor: number, minMinor: number, minPatch: number, canEqualMin: boolean, canEqualMax: boolean,
                          maxMajor: number, maxMinor: number, maxPatch: number): VersionSpecificationPackage {
    const maxVersion = createVersion(maxMajor, maxMinor, maxPatch);
    const minVersion = createVersion(minMajor, minMinor, minPatch);
    return {canEqualMax, canEqualMin, maxVersion, minVersion, type: "package"};
  }
}

let config = new ElmTestExtraConfig();

export {config as PluginConfig};
