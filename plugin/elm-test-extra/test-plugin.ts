import * as program from "commander";
import {PluginTestFramework, RunArgs} from "../../lib/plugin";

class ElmTestExtraPlugin implements PluginTestFramework {

  private static generateInitialSeed(): number {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  public initArgs(): RunArgs {
    return {
      runCount: program.runCount ? parseInt(program.runCount, 10) : 100,
      seed: program.seed ? program.seed : ElmTestExtraPlugin.generateInitialSeed()
    };
  }
}

export function createPlugin(): ElmTestExtraPlugin {
  return new ElmTestExtraPlugin();
}
