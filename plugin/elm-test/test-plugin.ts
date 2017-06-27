import * as program from "commander";
import {PluginTestFramework, RunArgs} from "../../lib/plugin";

class ElmTestPlugin implements PluginTestFramework {

  private static generateInitialSeed(): number {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  public initArgs(): RunArgs {
    return {
      runCount: program.runCount ? parseInt(program.runCount, 10) : 100,
      seed: program.seed ? program.seed : ElmTestPlugin.generateInitialSeed()
    };
  }
}

export function createPlugin(): ElmTestPlugin {
  return new ElmTestPlugin();
}
