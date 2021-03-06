import * as Bluebird from "bluebird";
import * as _ from "lodash";
import chalk from "chalk";
import * as chokidar from "chokidar";
import * as program from "commander";
import * as path from "path";
import * as shelljs from "shelljs";
import {Builder, createBuilder} from "./builder";
import {createLogger, Logger} from "./logger";
import {createRunner, Runner} from "./runner";
import {createUtil, Util} from "./util";
import {
  ExecutionContext, LoboConfig, PluginConfig, PluginReporter, PluginReporterWithConfig, PluginTestFrameworkConfig,
  PluginTestFrameworkWithConfig
} from "./plugin";
import {createElmPackageHelper, ElmPackageHelper} from "./elm-package-helper";
import {Analyzer, createAnalyzer} from "./analyzer";
import {createTestSuiteGenerator, TestSuiteGenerator} from "./test-suite-generator";
import {createOutputDirectoryManager, OutputDirectoryManager} from "./output-directory-manager";
import {createElmCodeLookupManager, ElmCodeLookupManager} from "./elm-code-lookup-manager";
import {createDependencyManager, DependencyManager} from "./dependency-manager";

export interface PartialLoboConfig {
  appDirectory: string | undefined;
  compiler: string | undefined;
  loboDirectory: string | undefined;
  noAnalysis: boolean | undefined;
  noCleanup: boolean | undefined;
  noInstall: boolean | undefined;
  noUpdate: boolean | undefined;
  optimize: boolean | undefined;
  prompt: boolean | undefined;
  reportProgress: boolean | undefined;
  reporter: PluginReporter | undefined;
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
  handleUncaughtException(error: Error): void;
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

  private readonly analyzer: Analyzer;
  private readonly builder: Builder;
  private busy: boolean;
  private readonly dependencyManager: DependencyManager;
  private readonly elmCodeLookupManager: ElmCodeLookupManager;
  private readonly elmPackageHelper: ElmPackageHelper;
  private readonly outputDirectoryManager: OutputDirectoryManager;
  private readonly logger: Logger;
  private ready: boolean;
  private readonly runner: Runner;
  private readonly testSuiteGenerator: TestSuiteGenerator;
  private readonly util: Util;
  private waiting: boolean;

  constructor(analyzer: Analyzer, builder: Builder, dependencyManager: DependencyManager, elmCodeLookupManager: ElmCodeLookupManager,
              elmPackageHelper: ElmPackageHelper, logger: Logger, outputDirectoryManager: OutputDirectoryManager, runner: Runner,
              testSuiteGenerator: TestSuiteGenerator, util: Util, busy: boolean, ready: boolean, waiting: boolean) {
    this.analyzer = analyzer;
    this.builder = builder;
    this.dependencyManager = dependencyManager;
    this.elmCodeLookupManager = elmCodeLookupManager;
    this.elmPackageHelper = elmPackageHelper;
    this.logger = logger;
    this.outputDirectoryManager = outputDirectoryManager;
    this.runner = runner;
    this.testSuiteGenerator = testSuiteGenerator;
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
      const config = this.configure();
      this.validateConfiguration();

      const context: ExecutionContext = <ExecutionContext> {
        codeLookup: {},
        config: <LoboConfig> config,
        testDirectory: program.testDirectory
      };

      if (program.watch) {
        this.watch(context);
      } else {
        this.launch(context);
      }
    } catch (err) {
      this.logger.debug(err.stack);
      this.logger.error(err.message);
      process.exit(1);
    }
  }

  public launchStages(initialContext: ExecutionContext): Bluebird<ExecutionContext> {
    const logStage = (context: ExecutionContext, stage: string) => {
      this.util.logStage(stage);

      return Bluebird.resolve(context);
    };

    const stages = [
      (context: ExecutionContext) => this.outputDirectoryManager.prepare(context),
      (context: ExecutionContext) => this.dependencyManager.sync(context),
      (context: ExecutionContext) => this.elmCodeLookupManager.sync(context),
      (context: ExecutionContext) => this.testSuiteGenerator.generate(context),
      (context: ExecutionContext) => this.builder.build(context),
      (context: ExecutionContext) => logStage(context, "TEST"),
      (context: ExecutionContext) => this.analyzer.analyze(context),
      (context: ExecutionContext) => this.runner.run(context)
    ];

    let value: ExecutionContext = initialContext;

    return Bluebird
      .mapSeries(stages, (item: (context: ExecutionContext) => Bluebird<ExecutionContext>) => item(value)
        .then((result: ExecutionContext) => value = result))
      .then(() => value)
      .finally(() => this.outputDirectoryManager.cleanup(value));
  }

  public launch(context: ExecutionContext): Bluebird<void> {
    return this.launchStages(context)
      .then(
        (result: ExecutionContext) => {
          this.logger.debug("Test execution complete");

          if (program.watch) {
            this.done(result);
          }
        })
      .catch((err) => {
        if (err instanceof ReferenceError || err instanceof TypeError) {
          this.handleUncaughtException(err, context);
          return;
        } else if (/Ran into a `Debug.crash` in module/.test(err)) {
          this.logger.error(err);
        } else if (/Build Failed|Analysis Issues Found|Test Run Failed/.test(err)) {
          // don't print anything
        } else {
          this.logger.error("Error running the tests. ", err);
        }

        if (program.watch) {
          this.done(context);
        } else {
          process.exit(1);
        }
      });
  }

  public done(context: ExecutionContext): void {
    this.util.logStage("WAITING");

    if (this.waiting === true) {
      this.waiting = false;
      this.busy = true;
      this.launch(context);
    } else {
      this.busy = false;
    }
  }

  public watch(context: ExecutionContext): void {
    const appElmJsonPath = this.elmPackageHelper.pathElmJson(context.config.appDirectory);
    let paths = [appElmJsonPath, "./src", "./tests"];
    const appElmPackage = this.elmPackageHelper.tryReadElmJson(context.config.appDirectory);

    if (appElmPackage && this.elmPackageHelper.isApplicationJson(appElmPackage) && appElmPackage.sourceDirectories) {
      const dirs = appElmPackage.sourceDirectories;

      paths = _.map(dirs, p => path.normalize(path.join(process.cwd(), context.config.appDirectory, p)))
        .filter(p => shelljs.test("-e", p))
        .concat(paths);
    }

    chokidar.watch(paths, {
      ignored: /(.*\/\..*)|(.*\/elm-stuff\/.*)/,
      persistent: true
    }).on("ready", () => {
      this.logger.trace("watch - ready");
      this.ready = true;
      this.launch(context);
    }).on("all", (event: string, filePath: string) => {
      this.logger.trace("watch - all - event: " + event + ", path: " + filePath);

      if (this.ready === false) {
        return;
      }

      this.logger.debug("Rebuild triggered by \"" + event + "\" at " + filePath);

      if (this.busy) {
        this.waiting = true;
      } else {
        this.busy = true;
        this.launch(context);
      }
    });
  }

  // ------------------------------------------------------
  // helpers
  // ------------------------------------------------------

  public configure(): PartialLoboConfig {
    const packageJson = this.util.unsafeLoad<{version: string}>("../package.json");
    const config: PartialLoboConfig = <PartialLoboConfig> {
      appDirectory: ".",
      loboDirectory: "./.lobo",
      optimize: false,
      prompt: true,
      testMainElm: "UnitTest.elm"
    };

    program.on("--help", () => this.showCustomHelp());

    program
      .version(packageJson.version)
      .option("--compiler <value>", "path to elm executable")
      .option("--debug", "disables optimization and auto-cleanup of temp files")
      .option("--failOnOnly", "exit with non zero exit code when there are any only tests")
      .option("--failOnSkip", "exit with non zero exit code when there are any skip tests")
      .option("--failOnTodo", "exit with non zero exit code when there are any todo tests")
      .option("--framework <value>", "name of the testing framework to use", "elm-test-extra")
      .option("--noAnalysis", "prevents lobo from running analysis on the test suite")
      .option("--noInstall", "prevents lobo from running elm install")
      .option("--noUpdate", "prevents lobo from updating lobo.json")
      .option("--optimize", "builds with optimize flag when there are no usages of debug module")
      .option("--prompt <value>", "default the answer to any questions", /^(y[es])|(n[o])$/i, "yes")
      .option("--quiet", "only outputs build info, test summary and errors")
      .option("--reporter <value>", "name of the reporter to use", "default-reporter")
      .option("--testDirectory <value>", "directory containing the tests to run", "tests")
      .option("--verbose", "outputs more detailed logging")
      .option("--veryVerbose", "outputs very detailed logging")
      .option("--watch", "watch for file changes and automatically rerun any effected tests");

    // parse args with allow unknown to find & load plugins with additional options
    program.allowUnknownOption(true);
    program.parse(process.argv);
    const reporterConfig = this.loadReporterConfig(program.reporter);
    const testFrameworkConfig = this.loadTestFrameworkConfig(program.framework);

    // re-parse args with plugins loaded
    program.allowUnknownOption(false);
    program.parse(process.argv);

    this.logger.debug("Options", program.opts());
    config.reporter = this.loadReporter(program.reporter, reporterConfig);
    config.testFramework = this.loadTestFramework(program.framework, testFrameworkConfig);

    if (!program.debug) {
      this.logger.debug("Enabling cleanup of temp files");
      config.noCleanup = false;
    } else {
      this.logger.debug("Disabling cleanup of temp files");
      config.noCleanup = true;
    }

    if (program.verbose !== true && program.veryVerbose !== true) {
      this.logger.debug("Silencing shelljs");
      shelljs.config.silent = true;
    }

    // configure shelljs to throw errors when any command errors
    shelljs.config.fatal = true;

    if (program.optimize) {
      config.optimize = true;
      this.logger.debug("Disabling optimized build");
    }

    if (program.prompt && program.prompt.toLowerCase()[0] === "n") {
      config.prompt = false;
      this.logger.debug("Disabling user prompts");
    }

    config.noAnalysis = program.noAnalysis === true;
    config.noInstall = program.noInstall === true;
    config.noUpdate = program.noUpdate === true;
    config.reportProgress = true;

    if (program.compiler) {
      config.compiler = path.normalize(program.compiler);
    }

    this.logger.trace("Config", config);

    return config;
  }

  public showCustomHelp(): void {
    const maxOptionLength = 29;
    this.logger.info("  Testing Frameworks:");
    this.logger.info("");
    this.showCustomHelpForPlugins(this.pluginType.testFramework, maxOptionLength);

    this.logger.info("  Reporters:");
    this.logger.info("");
    this.showCustomHelpForPlugins(this.pluginType.reporter, maxOptionLength);
  }

  public showCustomHelpForPlugins(pluginTypeDetail: PluginTypeDetail, maxOptionLength: number): void {
    const plugins = this.util.availablePlugins(pluginTypeDetail.fileSpec);

    _.forEach(plugins, (name: string) => {
      this.logger.info("   " + chalk.underline(name) + ":");
      this.logger.info("");
      const config = this.util.getPluginConfig(pluginTypeDetail.type, name, pluginTypeDetail.fileSpec);

      if (config && config.options && config.options.length > 0) {
        _.forEach(config.options, (option) => {
          const prefix = this.util.padRight("    " + option.flags, maxOptionLength);
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

    if (!shelljs.test("-e", program.testDirectory)) {
      this.logger.error("");
      this.logger.error(`Unable to find "${path.resolve(program.testDirectory)}"`);
      this.logger.info("");
      this.logger.info("You can override the default location (\"./tests\") by running:");
      this.logger.info("lobo --testDirectory [directory containing test files]");
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
    const plugin = this.util.getPlugin<PluginReporterWithConfig>(this.pluginType.reporter.type, pluginName,
                                                                 this.pluginType.reporter.fileSpec);
    (<PluginWithConfig><PluginReporterWithConfig>plugin).config = config;

    return plugin;
  }

  public loadReporterConfig(pluginName: string): PluginConfig {
    return this.loadPluginConfig<PluginConfig>(this.pluginType.reporter, pluginName);
  }

  public loadTestFramework(pluginName: string, config: PluginTestFrameworkConfig): PluginTestFrameworkWithConfig {
    const plugin = this.util.getPlugin<PluginTestFrameworkWithConfig>(this.pluginType.testFramework.type, pluginName,
                                                                      this.pluginType.testFramework.fileSpec);
    (<PluginWithConfig><PluginTestFrameworkWithConfig>plugin).config = config;

    return plugin;
  }

  public loadTestFrameworkConfig(pluginName: string): PluginTestFrameworkConfig {
    return this.loadPluginConfig<PluginTestFrameworkConfig>(this.pluginType.testFramework, pluginName);
  }

  public loadPluginConfig<T extends PluginConfig>(pluginTypeDetail: PluginTypeDetail, pluginName: string): T {
    const config = this.util.getPluginConfig<T>(pluginTypeDetail.type, pluginName, pluginTypeDetail.fileSpec);

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

  public handleUncaughtException(error: Error, context?: ExecutionContext): void {
    let errorString: string = "";

    if (error) {
      errorString = error.toString();
    }

    if (error instanceof ReferenceError || error instanceof TypeError) {
      if (context && context.buildOutputFilePath && error.stack && error.stack.match(new RegExp(context.buildOutputFilePath))) {
        if (/ElmTest.*Plugin\$findTests is not defined/.test(errorString)) {
          this.logger.error("Error running the tests. This is usually caused by an npm upgrade to lobo: ");
          this.logger.info("");
          this.logger.error(errorString);
          this.logger.info("");
          this.logger.error("Please delete .lobo & elm-stuff directories and try again");
        } else {
          this.logger.error("Error running the tests. This is usually caused by an elm package using objects that " +
            "are found in the browser but not in a node process");
          this.logger.info("");
          this.logger.error(errorString);
          this.logger.info("");

          if (program.veryVerbose || program.verbose) {
            this.logger.error("Please raise an issue against lobo including the above messages to request adding support for the " +
              "elm package that caused this issue");
          } else {
            this.logger.error("Please rerun lobo with the --verbose option to see the cause of the error");
          }
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

    if (context && program.watch) {
      this.done(context);
      return;
    }

    process.exit(1);
  }
}

export function createLobo(returnFake: boolean = false): Lobo {
  if (returnFake) {
    return <Lobo> { execute: () => { /* do nothing */ } };
  }

  return new LoboImp(createAnalyzer(), createBuilder(), createDependencyManager(), createElmCodeLookupManager(), createElmPackageHelper(),
                     createLogger(), createOutputDirectoryManager(), createRunner(), createTestSuiteGenerator(), createUtil(),
                     false, false, false);
}
