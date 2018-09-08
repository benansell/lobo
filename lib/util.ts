import * as levenshtein from "fast-levenshtein";
import * as fs from "fs";
import * as _ from "lodash";
import * as shelljs from "shelljs";
import {createLogger, Logger} from "./logger";
import * as path from "path";
import {PluginConfig, PluginReporter, PluginTestFramework} from "./plugin";

export interface Util {
  availablePlugins(fileSpec: RegExp | string): string[];
  checkNodeVersion(major: number, minor: number, patch: number): void;
  closestMatch(name: string, items: string[]): string;
  getPlugin<T extends PluginReporter | PluginTestFramework>(type: string, pluginName: string, fileSpec: string): T;
  getPluginConfig<T extends PluginConfig>(type: string, pluginName: string, fileSpec: string): T;
  isInteger(value: number): boolean;
  padRight(value: string, length: number, spacer?: string): string;
  read(filePath: string): string | undefined;
  resolveDir(...dirs: string[]): string;
  sortObject<T extends {[index: string]: S}, S>(obj: T): T;
  unsafeLoad<T>(filePath: string): T;
}

export class UtilImp implements Util {

  private logger: Logger;

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public availablePlugins(fileSpec: RegExp | string): string[] {
    let pattern = new RegExp(fileSpec + ".*\.js$");
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
      this.logger.error(`lobo requires node v${major}.${minor}.${patch} or greater - upgrade the installed version of node and try again`);
      process.exit(1);
    }
  }

  public closestMatch(name: string, items: string[]): string {
    return <string> _.minBy(items, (i: string) => levenshtein.get(name, i));
  }

  public getPlugin<T extends PluginReporter | PluginTestFramework>(type: string, pluginName: string, fileSpec: string): T {
    let value = this.load<{createPlugin: () => T}>(type, pluginName, fileSpec, false);
    let plugin: T = value.createPlugin();
    this.logger.debug("Plugin loaded: "  + pluginName);
    this.logger.trace("plugin", plugin);

    return plugin;
  }

  public getPluginConfig<T extends PluginConfig>(type: string, pluginName: string, fileSpec: string): T {
      let value = this.load<{PluginConfig: T}>(type, pluginName, fileSpec, true);
      let config = value.PluginConfig;
      this.logger.debug("Plugin configured: " + pluginName);
      this.logger.trace("Plugin configuration", config);

      return config;
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

  public load<T>(type: string, pluginName: string, fileSpec: string, isConfiguration: boolean): T {
    try {
      let filePath: string;

      if (isConfiguration) {
        filePath = path.join("..", "plugin", pluginName, "plugin-config");
      } else {
        filePath = path.join("..", "plugin", pluginName, fileSpec);
      }

      return this.unsafeLoad<T>(filePath);
    } catch (err) {
      if (err && err instanceof SyntaxError) {
        this.logger.error("Unable to load " + pluginName + " due to a syntax error in " + pluginName + "/" + fileSpec + ".js");
      } else {
        let typeName = isConfiguration ? type + " configuration" : type;
        this.logger.error(pluginName + " " + typeName + " not found");
        let plugins = this.availablePlugins(fileSpec);
        this.logger.error("Did you mean \"" + this.closestMatch(pluginName, plugins) + "\" ?");
      }

      process.exit(1);
      return <T> {};
    }
  }

  public read(filePath: string): string | undefined {
    try {
      if (!fs.existsSync(filePath)) {
        return undefined;
      }

      return fs.readFileSync(filePath, "utf8");
    } catch (err) {
      this.logger.debug(err);
      return undefined;
    }
  }

  public resolveDir(...dirs: string[]): string {
    let resolved = path.resolve(...dirs);

    if (!fs.existsSync(resolved)) {
      return resolved;
    }

    let stats = fs.lstatSync(resolved);

    if (!stats.isSymbolicLink()) {
      return resolved;
    }

    return fs.realpathSync(resolved);
  }

  public sortObject<T extends {[index: string]: S}, S>(obj: T): T {
    const sortedKeys = Object.keys(obj).sort();
    const result = <T> {};

    for (const k of sortedKeys) {
      result[k] = obj[k];
    }

    return result;
  }

  public unsafeLoad<T>(filePath: string): T {
    // tslint:disable:no-require-imports
    return require(filePath);
    // tslint:enable:no-require-imports
  }
}

export function createUtil(): Util {
  return new UtilImp(createLogger());
}
