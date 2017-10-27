import * as Bluebird from "bluebird";
import * as _ from "lodash";
import chalk from "chalk";
import * as chokidar from "chokidar";
import * as program from "commander";
import * as path from "path";
import * as shelljs from "shelljs";
import * as tmp from "tmp";

import {Builder, createBuilder} from "./builder";
import {createLogger, Logger} from "./logger";
import {createRunner, Runner} from "./runner";
import {createUtil, Util} from "./util";
import {
  LoboConfig, PluginConfig, PluginReporter, PluginReporterWithConfig, PluginTestFrameworkConfig,
  PluginTestFrameworkWithConfig
} from "./plugin";
import {createElmPackageHelper, ElmPackageHelper} from "./elm-package-helper";

interface PartialLoboConfig {
  compiler: string | undefined;
  noInstall: boolean | undefined;
  noUpdate: boolean | undefined;
  noWarn: boolean | undefined;
  prompt: boolean | undefined;
  reportProgress: boolean | undefined;
  reporter: PluginReporter | undefined;
  testFile: string | undefined;
  testFramework: PluginTestFrameworkWithConfig | undefined;
  testMainElm: string;
}

interface PluginWithConfig {
  config: PluginConfig;
}

interface PluginTypeDetail {
  fileSpec: string;
  type: string;
}

export interface Lobo {
  execute(): void;
  handleUncaughtException(error: Error, config?: PartialLoboConfig): void;
}

export class LoboImp implements Lobo {

  private pluginType: { reporter: PluginTypeDetail, testFramework: PluginTypeDetail } = {
    reporter: {
      fileSpec: "reporter-plugin",
      type: "reporter"
    },
    testFramework: {
      fileSpec: "test-plugin",
      type: "testing framework"
    }
  };

  private builder: Builder;
  private busy: boolean;
  private elmPackageHelper: ElmPackageHelper;
  private logger: Logger;
  private ready: boolean;
  private runner: Runner;
  private util: Util;
  private waiting: boolean;

  public static generateTestFileName(): string {
    let tmpFile = tmp.fileSync({prefix: "lobo-test-", postfix: ".js"});

    return tmpFile.name;
  }

  constructor(builder: Builder, elmPackageHelper: ElmPackageHelper, logger: Logger, runner: Runner, util: Util,
              busy: boolean, ready: boolean, waiting: boolean) {
    this.builder = builder;
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
    this.runner = runner;
    this.util = util;

    this.busy = busy;
    this.ready = ready;
    this.waiting = waiting;
  }

  public execute(): void {
    this.util.checkNodeVersion(0, 11, 13);

    this.busy = false;
    this.ready = false;
    this.waiting = false;

    try {
      let config = this.configure();
      this.validateConfiguration();

      if (program.watch) {
        this.watch(config);
      } else {
        this.launch(config);
      }
    } catch (err) {
      this.logger.debug(err.stack);
      this.logger.error(err.message);
      process.exit(1);
    }
  }

  public launch(partialConfig: PartialLoboConfig): Bluebird<void> {
    partialConfig.testFile = LoboImp.generateTestFileName();
    let config = <LoboConfig> partialConfig;

    let stages = [
      () => this.builder.build(config, program.testDirectory, program.testFile),
      () => this.runner.run(config)
    ];

    return Bluebird.mapSeries(stages, (item: () => Bluebird<object>) => {
      return item();
    }).then(() => {
      this.logger.debug("launch success");
      if (program.watch) {
        this.done(config);
      }
    }).catch((err) => {
      if (err instanceof ReferenceError) {
        this.handleUncaughtException(err, config);
        return;
      } else if (/Ran into a `Debug.crash` in module/.test(err)) {
        this.logger.error(err);
      } else {
        this.logger.debug("launch failed", err);
      }

      if (program.watch) {
        this.done(config);
      } else {
        process.exit(1);
      }
    });
  }

  public done(config: PartialLoboConfig): void {
    this.logger.info("----------------------------------[ WAITING ]-----------------------------------");

    if (this.waiting === true) {
      this.waiting = false;
      this.busy = true;
      this.launch(config);
    } else {
      this.busy = false;
    }
  }

  public watch(config: PartialLoboConfig): void {
    let paths = ["./elm-package.json"];
    let testElmPackage = this.elmPackageHelper.read(program.testDirectory);

    if (testElmPackage && testElmPackage.sourceDirectories) {
      let dirs = testElmPackage.sourceDirectories;

      paths = _.map(dirs, p => path.normalize(path.join(process.cwd(), program.testDirectory, p)))
        .filter(p => shelljs.test("-e", p))
        .concat(paths);
    }

    chokidar.watch(paths, {
      ignored: /(.*\/\..*)|(.*\/elm-stuff\/.*)/,
      persistent: true
    }).on("ready", () => {
      this.ready = true;
      this.launch(config);
    }).on("all", (event: string, filePath: string) => {
      this.logger.trace("watch - event: " + event + ", path: " + filePath);

      if (this.ready === false) {
        return;
      }

      this.logger.debug("Rebuild triggered by \"" + event + "\" at " + filePath);

      if (this.busy) {
        this.waiting = true;
      } else {
        this.busy = true;
        this.launch(config);
      }
    });
  }

  // ------------------------------------------------------
  // helpers
  // ------------------------------------------------------

  public configure(): PartialLoboConfig {
    let packageJson = this.util.unsafeLoad<{version: string}>("../package.json");
    let config: PartialLoboConfig = <PartialLoboConfig> {
      testMainElm: "UnitTest.elm"
    };

    program.on("--help", () => this.showCustomHelp());

    program
      .version(packageJson.version)
      .option("--compiler <value>", "path to compiler")
      .option("--debug", "disables auto-cleanup of temp files")
      .option("--failOnOnly", "exit with non zero exit code when there are any only tests")
      .option("--failOnSkip", "exit with non zero exit code when there are any skip tests")
      .option("--failOnTodo", "exit with non zero exit code when there are any todo tests")
      .option("--framework <value>", "name of the testing framework to use", "elm-test-extra")
      .option("--noInstall", "prevents lobo from running elm-package install")
      .option("--noUpdate", "prevents lobo updating the test elm-package.json")
      .option("--noWarn", "hides elm make build warnings")
      .option("--prompt <value>", "default the answer to any questions", /^(y[es])|(n[o])$/i, "yes")
      .option("--quiet", "only outputs build info, test summary and errors")
      .option("--reporter <value>", "name of the reporter to use", "default-reporter")
      .option("--testDirectory <value>", "directory containing the tests to run", "tests")
      .option("--testFile <value>", "location of Tests.elm within the tests directory", "Tests.elm")
      .option("--verbose", "outputs more detailed logging")
      .option("--veryVerbose", "outputs very detailed logging")
      .option("--watch", "watch for file changes and automatically rerun any effected tests");

    // parse args with allow unknown to find & load plugins with additional options
    program.allowUnknownOption(true);
    program.parse(process.argv);
    let reporterConfig = this.loadReporterConfig(program.reporter);
    let testFrameworkConfig = this.loadTestFrameworkConfig(program.framework);

    // re-parse args with plugins loaded
    program.allowUnknownOption(false);
    program.parse(process.argv);

    this.logger.debug("options", program.opts());
    config.reporter = this.loadReporter(program.reporter, reporterConfig);
    config.testFramework = this.loadTestFramework(program.framework, testFrameworkConfig);

    if (!program.debug) {
      this.logger.debug("enabling auto-cleanup of temp files");
      tmp.setGracefulCleanup();
    }

    if (program.verbose !== true && program.veryVerbose !== true) {
      this.logger.debug("silencing shelljs");
      shelljs.config.silent = true;
    }

    // configure shelljs to throw errors when any command errors
    shelljs.config.fatal = true;

    if (program.prompt) {
      config.prompt = program.prompt.toLowerCase()[0] === "y";
    }

    config.noInstall = program.noInstall === true;
    config.noUpdate = program.noUpdate === true;
    config.noWarn = program.noWarn === true;
    config.reportProgress = true;

    if (program.compiler) {
      config.compiler = path.normalize(program.compiler);
    }

    this.logger.trace("config", config);

    return config;
  }

  public showCustomHelp(): void {
    let maxOptionLength = 29;
    this.logger.info("  Testing Frameworks:");
    this.logger.info("");
    this.showCustomHelpForPlugins(this.pluginType.testFramework, maxOptionLength);

    this.logger.info("  Reporters:");
    this.logger.info("");
    this.showCustomHelpForPlugins(this.pluginType.reporter, maxOptionLength);
  }

  public showCustomHelpForPlugins(pluginTypeDetail: PluginTypeDetail, maxOptionLength: number): void {
    let plugins = this.util.availablePlugins(pluginTypeDetail.fileSpec);

    _.forEach(plugins, (name: string) => {
      this.logger.info("   " + chalk.underline(name) + ":");
      this.logger.info("");
      let config = this.util.getPluginConfig(pluginTypeDetail.type, name, pluginTypeDetail.fileSpec);

      if (config && config.options && config.options.length > 0) {
        _.forEach(config.options, (option) => {
          let prefix = this.util.padRight("    " + option.flags, maxOptionLength);
          this.logger.info(prefix + option.description);
        });
      }
      this.logger.info("");
    });
  }

  public validateConfiguration(): void {
    let exit = false;
    if (program.compiler) {
      if (!shelljs.test("-e", program.compiler)) {
        this.logger.error("");
        this.logger.error("Unable to find the elm compiler");
        this.logger.error("Please check that it exists at the supplied path:");
        this.logger.error(path.resolve(program.compiler));
        exit = true;
      }
    }

    let testsElm = path.join(program.testDirectory, program.testFile);

    if (!shelljs.test("-e", testsElm)) {
      this.logger.error("");
      this.logger.error(`Unable to find "${path.basename(program.testFile)}"`);
      this.logger.error("Please check that it exists in the test directory:");
      this.logger.error(path.resolve(path.dirname(testsElm)));
      this.logger.info("");
      this.logger.info("You can override the default location (\"./tests\") by running either:");
      this.logger.info("lobo --testDirectory [directory containing Tests.elm]");
      this.logger.info("or");
      this.logger.info("lobo --testFile [relative path to main test file inside --testDirectory]");
      exit = true;
    }

    if (program.framework === "elm-test") {
      if (program.showSkip) {
        this.logger.error("");
        this.logger.error("Invalid configuration combination");
        this.logger.error("--showSkip is only available with the default test framework (elm-test-extra)");
        exit = true;
      }
    }

    if (program.reporter === "junit-reporter") {
      if (!program.reportFile) {
        this.logger.error("");
        this.logger.error("Missing mandatory configuration option");
        this.logger.error("--reportFile is a required option when using the junit-reporter");
        exit = true;
      }

      if (!this.util.isInteger(program.diffMaxLength)) {
        this.logger.error("");
        this.logger.error("Invalid configuration option");
        this.logger.error("--diffMaxLength value is not an integer");
        exit = true;
      }
    }

    if (exit === true) {
      this.logger.info("");
      this.logger.info("For further help run:");
      this.logger.info("lobo --help");
      this.logger.info("");
      process.exit(1);
    }
  }

  public loadReporter(pluginName: string, config: PluginConfig): PluginReporterWithConfig {
    let plugin = this.util.getPlugin<PluginReporterWithConfig>(this.pluginType.reporter.type, pluginName,
                                                               this.pluginType.reporter.fileSpec);
    (<PluginWithConfig><PluginReporterWithConfig>plugin).config = config;

    return plugin;
  }

  public loadReporterConfig(pluginName: string): PluginConfig {
    return this.loadPluginConfig<PluginConfig>(this.pluginType.reporter, pluginName);
  }

  public loadTestFramework(pluginName: string, config: PluginTestFrameworkConfig): PluginTestFrameworkWithConfig {
    let plugin = this.util.getPlugin<PluginTestFrameworkWithConfig>(this.pluginType.testFramework.type, pluginName,
                                                                    this.pluginType.testFramework.fileSpec);
    (<PluginWithConfig><PluginTestFrameworkWithConfig>plugin).config = config;

    return plugin;
  }

  public loadTestFrameworkConfig(pluginName: string): PluginTestFrameworkConfig {
    return this.loadPluginConfig<PluginTestFrameworkConfig>(this.pluginType.testFramework, pluginName);
  }

  public loadPluginConfig<T extends PluginConfig>(pluginTypeDetail: PluginTypeDetail, pluginName: string): T {
    let config = this.util.getPluginConfig<T>(pluginTypeDetail.type, pluginName, pluginTypeDetail.fileSpec);

    if (!config || !config.options) {
      return config;
    }

    _.forEach(config.options, opt => {
      if (opt.flags) {
        program.option(opt.flags, opt.description, opt.parser, opt.defaultValue);
      } else {
        this.logger.error("Ignoring " + pluginTypeDetail.type + " option with missing flags property", opt);
      }
    });

    return config;
  }

  public handleUncaughtException(error: Error, config?: PartialLoboConfig): void {
    let errorString: string = "";

    if (error) {
      errorString = error.toString();
    }

    if (error instanceof ReferenceError) {
      if (config && config.testFile && error.stack && error.stack.match(new RegExp(config.testFile))) {
        if (/ElmTest.*Plugin\$findTests is not defined/.test(errorString)) {
          this.logger.error("Error running the tests. This is usually caused by an npm upgrade to lobo: ");
          this.logger.info("");
          this.logger.error(errorString);
          this.logger.info("");
          this.logger.error("Please delete tests/elm-stuff and try again");
        } else {
          this.logger.error("Error running the tests. This is usually caused by an elm package using objects that " +
            "are found in the browser but not in a node process");
          this.logger.info("");
          this.logger.error(errorString);
          this.logger.info("");
          this.logger.error("Please raise an issue against lobo to request adding support for the elm-package that " +
            "is referencing the above browser object");
        }
      } else {
        this.logger.error("Unhandled exception", errorString);
      }

      if (error.stack) {
        this.logger.debug(error.stack);
      }
    } else {
      this.logger.error("Unhandled exception", errorString);

      if (error && error.stack) {
        this.logger.debug(error.stack);
      }
    }

    if (config && program.watch) {
      this.done(config);
      return;
    }

    process.exit(1);
  }
}

export function createLobo(returnFake: boolean = false): Lobo {
  if (returnFake) {
    return <Lobo> { execute: () => { /* do nothing */ } };
  }

  return new LoboImp(createBuilder(), createElmPackageHelper(), createLogger(), createRunner(), createUtil(), false, false, false);
}
