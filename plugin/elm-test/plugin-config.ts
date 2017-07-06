import {Dependencies, PluginTestFrameworkConfig, PluginOption} from "../../lib/plugin";

export class ElmTestConfig implements PluginTestFrameworkConfig {
  public name: string = "elm-test";

  public sourceDirectories: string[] = ["runner", "plugin/elm-test"];

  public dependencies: Dependencies = {
    "elm-community/elm-test": "4.0.0 <= v < 5.0.0",
    "mgold/elm-random-pcg": "5.0.0 <= v < 6.0.0"
  };

  public options: PluginOption[] = [
    {flags: "--seed <value>", description: "initial seed value for fuzz tests; defaults to a random value"},
    {flags: "--runCount <value>", description: "run count for fuzz tests; defaults to 100"}
  ];
}

let config = new ElmTestConfig();

export {config as PluginConfig};