import {PluginConfig, PluginOption} from "../../lib/plugin";

export class JsonReporterConfig implements PluginConfig {
  public name: string = "json-reporter";

  public options: PluginOption[] = [
    {flags: "--reportFile [value]", description: "optional path to save the results to"}
  ];
}

let config = new JsonReporterConfig();

export {config as PluginConfig};
