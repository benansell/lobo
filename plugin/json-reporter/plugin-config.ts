import {PluginConfig, PluginOption} from "../../lib/plugin";

export class JsonReporterConfig implements PluginConfig {
  public name: string = "json-reporter";

  public options: PluginOption[] = [];
}

let config = new JsonReporterConfig();

export {config as PluginConfig};
