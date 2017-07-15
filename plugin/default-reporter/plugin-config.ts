import {PluginConfig, PluginOption} from "../../lib/plugin";

export class DefaultReporterConfig implements PluginConfig {
  public name: string = "default-reporter";

  public options: PluginOption[] = [
    {flags: "--showSkip", description: "report skipped tests after the summary"},
    {flags: "--showTodo", description: "report todo tests after the summary"}
  ];
}

let config = new DefaultReporterConfig();

export {config as PluginConfig};
