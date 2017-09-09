import {Dependencies, PluginTestFrameworkConfig, PluginOption} from "../../lib/plugin";

export class ElmTestExtraConfig implements PluginTestFrameworkConfig {
  public name: string = "elm-test-extra";

  public sourceDirectories: string[] = ["runner", "plugin/elm-test-extra"];

  public dependencies: Dependencies = {
    "benansell/lobo-elm-test-extra": "2.0.0 <= v < 3.0.0",
    "eeue56/elm-lazy": "1.0.0 <= v < 2.0.0",
    "eeue56/elm-lazy-list": "1.0.0 <= v < 2.0.0",
    "eeue56/elm-shrink": "1.0.0 <= v < 2.0.0",
    "elm-community/elm-test": "4.2.0 <= v < 5.0.0",
    "elm-lang/core": "5.0.0 <= v < 6.0.0",
    "mgold/elm-random-pcg": "5.0.0 <= v < 6.0.0"
  };

  public options: PluginOption[] = [
    {flags: "--seed <value>", description: "initial seed value for fuzz tests; defaults to a random value"},
    {flags: "--runCount <value>", description: "run count for fuzz tests; defaults to 100"}
  ];
}

let config = new ElmTestExtraConfig();

export {config as PluginConfig};
