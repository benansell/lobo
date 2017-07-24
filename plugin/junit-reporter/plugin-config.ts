import {PluginConfig, PluginOption} from "../../lib/plugin";

export class JUnitReporterConfig implements PluginConfig {
  public name: string = "junit-reporter";

  public options: PluginOption[] = [
    {flags: "--reportFile <value>", description: "path to save the results to"}
  ];
}

let config = new JUnitReporterConfig();

export {config as PluginConfig};
