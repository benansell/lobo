import * as levenshtein from "fast-levenshtein";
import * as _ from "lodash";
import * as shelljs from "shelljs";
import {createLogger, Logger} from "./logger";
import * as path from "path";
import {PluginConfig} from "./plugin";

export interface Util {
  availablePlugins(fileSpec: RegExp | string): string[];
  checkNodeVersion(major: number, minor: number, patch: number): void;
  closestMatch(name: string, items: string[]): string;
  getPlugin<T>(type: string, pluginName: string, fileSpec: string): T;
  getPluginConfig(type: string, pluginName: string, fileSpec: string): PluginConfig;
  padRight(value: string, length: number, spacer?: string): string;
}

export class UtilImp implements Util {

  private logger: Logger;

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public availablePlugins(fileSpec: RegExp | string): string[] {
    let pattern = new RegExp(fileSpec);
    let pluginDirectory = path.resolve(__dirname, "..", "plugin");
    let files = shelljs.find(pluginDirectory).filter((file: string) => file.match(pattern));

    return _.map(files, (file: string) => {
      let pluginPath = path.relative(pluginDirectory, file);
      return path.dirname(pluginPath);
    });
  }

  public checkNodeVersion(major: number, minor: number, patch: number): void {
    if (!this.isInteger(major)) {
      throw new Error("major is not an integer" + major);
    }

    if (!this.isInteger(minor)) {
      throw new Error("minor is not an integer" + major);
    }

    if (!this.isInteger(patch)) {
      throw new Error("patch is not an integer" + major);
    }

    let nodeVersionString = process.versions.node;
    let nodeVersion = _.map(_.split(nodeVersionString, "."), _.parseInt);

    if ((nodeVersion[0] < major) ||
      (nodeVersion[0] === major && nodeVersion[1] < minor) ||
      (nodeVersion[0] === major && nodeVersion[1] === minor && nodeVersion[2] < patch)) {
      this.logger.info("using node v" + nodeVersionString);
      this.logger.error("lobo requires node v" + major + "." + minor + "." + patch + " or greater " +
        "- upgrade the installed version of node and try again");
      process.exit(1);
    }
  }

  public closestMatch(name: string, items: string[]): string {
    return <string> _.minBy(items, (i: string) => levenshtein.get(name, i));
  }

  public getPlugin<T>(type: string, pluginName: string, fileSpec: string): T {
    try {
      // tslint:disable:no-require-imports
      let Plugin = require(path.join("..", "plugin", pluginName, fileSpec));
      // tslint:enable:no-require-imports

      let plugin = Plugin.createPlugin();
      this.logger.debug(pluginName + " plugin loaded");
      plugin.config = this.getPluginConfig(type, pluginName, fileSpec);
      this.logger.trace("plugin", plugin);

      return <T> plugin;
    } catch (err) {
      if (err && err instanceof SyntaxError) {
        this.logger.error("Unable to load " + pluginName + " due to a syntax error in " + pluginName + "/" + fileSpec + ".js");
      } else {
        this.logger.error(pluginName + " " + type + " not found");
        let plugins = this.availablePlugins(fileSpec);
        this.logger.error("Did you mean \"" + this.closestMatch(pluginName, plugins) + "\" ?");
      }

      process.exit(1);
      return <T> {};
    }
  }

  public getPluginConfig(type: string, pluginName: string, fileSpec: string): PluginConfig {
    try {
      // tslint:disable:no-require-imports
      let config = require(path.join("..", "plugin", pluginName, "plugin-config")).PluginConfig;
      // tslint:enable:no-require-imports

      this.logger.debug(pluginName + " plugin configured");
      this.logger.trace("plugin configuration", config);
      return config;
    } catch (err) {
      if (err && err instanceof SyntaxError) {
        this.logger.error("Unable to load " + pluginName + " due to a syntax error in " + pluginName + "/plugin-config.js");
      } else {
        this.logger.error(pluginName + " " + type + " configuration not found");
        let plugins = this.availablePlugins(fileSpec);
        this.logger.error("Did you mean \"" + this.closestMatch(pluginName, plugins) + "\" ?");
      }

      process.exit(1);
      return <PluginConfig> {};
    }
  }

  public isInteger(value: number): boolean {
    return parseInt(value.toString(), 10) === value;
  }

  public padRight(value: string, length: number, spacer?: string): string {
    if (!spacer) {
      spacer = " ";
    }

    return (value.length < length) ? this.padRight(value + spacer, length, spacer) : value;
  }

  public wait(delayInMilliseconds: number): void {
    let endTime = delayInMilliseconds + new Date().getTime();

    while (new Date().getTime() < endTime) {
      // wait
    }
  }
}

export function createUtil(): Util {
  return new UtilImp(createLogger());
}
