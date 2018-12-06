import {PluginConfig, PluginOption} from "../../lib/plugin";

export class DefaultReporterConfig implements PluginConfig {
  public name: string = "default-reporter";

  public options: PluginOption[] = [
    {flags: "--hideDebugMessages", description: "prevent reporting of any test Debug.log messages"},
    {flags: "--showSkip", description: "report skipped tests after the summary"},
    {flags: "--showTodo", description: "report todo tests after the summary"}
  ];
}

const config = new DefaultReporterConfig();

export {config as PluginConfig};
