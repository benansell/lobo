import {PluginConfig, PluginOption} from "../../lib/plugin";

export class JUnitReporterConfig implements PluginConfig {
  public name: string = "junit-reporter";

  public options: PluginOption[] = [
    { defaultValue: 150, description: "max length of diffed failure messages; defaults to 150 characters"
    , flags: "--diffMaxLength [value]", parser: JUnitReporterConfig.parseDiffMaxLength },
    { defaultValue: "text", description: "format failure messages as plain text or html; defaults to text"
    , flags: "--junitFormat [value]", parser: /^html|text$/i },
    {flags: "--reportFile <value>", description: "path to save the results to"}
  ];

  public static parseDiffMaxLength(value: string): number {
    return parseInt(value, 10);
  }
}

const config = new JUnitReporterConfig();

export {config as PluginConfig};
