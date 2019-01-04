"use strict";

import * as _ from "lodash";
import * as chai from "chai";
import {ExecOutputReturnValue} from "shelljs";

const expect = chai.expect;

function analysisHidden(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/Hidden Tests/);
}

function analysisOverExposed(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/Over Exposed Tests/);
}

function analysisSummary(result: ExecOutputReturnValue, hidden: number, overExposed: number): void {
  if (hidden > 0) {
    expect(result.stdout).to.match(new RegExp("Found\\s+" + hidden + " hidden test"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("hidden test"));
  }

  if (overExposed > 0) {
    expect(result.stdout).to.match(new RegExp("Found\\s+" + overExposed + " over exposed test"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("over exposed test"));
  }
}

function elmMakeError(result: ExecOutputReturnValue): void {
  // unable to capture and examine elm make errors, so all we can do is check that it failed
  expect(result.stdout).to.match(/Failed to run elm command: make/);
}

function summaryArgument(result: ExecOutputReturnValue, argName: string, argValue: object): void {
  expect(result.stdout).to.match(new RegExp(argName + ":\\s+" + argValue));
}

function summaryCounts(result: ExecOutputReturnValue, pass: number, fail: number, todo?: number, skip?: number, ignore?: number): void {
  expect(result.stdout).to.match(new RegExp("Passed:\\s+" + pass + "(.\\[\\d\\dm)?\n"));
  expect(result.stdout).to.match(new RegExp("([^.]*.){" + pass + "}"));
  expect(result.stdout).to.match(new RegExp("Failed:\\s+" + fail + "(.\\[\\d\\dm)?\n"));
  expect(result.stdout).to.match(new RegExp("([^!]*!){" + fail + "}"));

  if (todo || todo === 0) {
    expect(result.stdout).to.match(new RegExp("Todo:\\s+" + todo + "(.\\[\\d\\dm)?\n"));
    expect(result.stdout).to.match(new RegExp("([^-]*-){" + todo + "}"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("Todo:\\s+"));
  }

  if (skip || skip === 0) {
    expect(result.stdout).to.match(new RegExp("Skipped:\\s+" + skip + "(.\\[\\d\\dm)?\n"));
    expect(result.stdout).to.match(new RegExp("([^?]*?){" + skip + "}"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("Skipped:\\s+"));
  }

  if (ignore || ignore === 0) {
    expect(result.stdout).to.match(new RegExp("Ignored:\\s+" + ignore + "(.\\[\\d\\dm)?\n"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("Ignored:\\s+"));
  }
}

function summaryFailed(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/TEST RUN FAILED/);
}

function summaryFocused(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/FOCUSED TEST RUN/);
}

function summaryInconclusive(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/TEST RUN INCONCLUSIVE/);
}

function summaryPartial(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/PARTIAL TEST RUN/);
}

function summaryPassed(result: ExecOutputReturnValue): void {
  expect(result.stdout).to.match(/TEST RUN PASSED/);
}

export interface ReporterExpect {
  analysisHidden(): void;
  analysisOverExposed(): void;
  analysisSummary(hidden: number, overExposed: number): void;
  analysisUnisolated(): void;
  elmMakeError(): void;
  summaryArgument(argName: string, argValue: object): void;
  summaryCounts(pass: number, fail: number, todo?: number, skip?: number, ignore?: number): void;
  summaryFailed(): void;
  summaryFocused(): void;
  summaryInconclusive(): void;
  summaryPartial(): void;
  summaryPassed(): void;
}

export default function(result: ExecOutputReturnValue): ReporterExpect {
  return <ReporterExpect> {
    analysisHidden: _.wrap(result, analysisHidden),
    analysisOverExposed: _.wrap(result, analysisOverExposed),
    analysisSummary: _.wrap(result, analysisSummary),
    elmMakeError: _.wrap(result, elmMakeError),
    summaryArgument: _.wrap(result, summaryArgument),
    summaryCounts: _.wrap(result, summaryCounts),
    summaryFailed: _.wrap(result, summaryFailed),
    summaryFocused: _.wrap(result, summaryFocused),
    summaryInconclusive: _.wrap(result, summaryInconclusive),
    summaryPartial: _.wrap(result, summaryPartial),
    summaryPassed: _.wrap(result, summaryPassed)
  };
}
