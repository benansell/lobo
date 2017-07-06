"use strict";

import * as _ from "lodash";
import * as chai from "chai";
import {ExecOutputReturnValue} from "shelljs";

let expect = chai.expect;

function summaryArgument(result: ExecOutputReturnValue, argName: string, argValue: object): void {
  expect(result.stdout).to.match(new RegExp(argName + ":\\s+" + argValue));
}

function summaryCounts(result: ExecOutputReturnValue, pass: number, fail: number, todo?: number, skip?: number, ignore?: number): void {
  expect(result.stdout).to.match(new RegExp("Passed:\\s+" + pass + "\n"));
  expect(result.stdout).to.match(new RegExp("([^.]*.){" + pass + "}"));
  expect(result.stdout).to.match(new RegExp("Failed:\\s+" + fail + "\n"));
  expect(result.stdout).to.match(new RegExp("([^!]*!){" + fail + "}"));

  if (todo || todo === 0) {
    expect(result.stdout).to.match(new RegExp("Todo:\\s+" + todo + "\n"));
    expect(result.stdout).to.match(new RegExp("([^-]*-){" + todo + "}"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("Todo:\\s+"));
  }

  if (skip || skip === 0) {
    expect(result.stdout).to.match(new RegExp("Skipped:\\s+" + skip + "\n"));
    expect(result.stdout).to.match(new RegExp("([^?]*?){" + skip + "}"));
  } else {
    expect(result.stdout).not.to.match(new RegExp("Skipped:\\s+"));
  }

  if (ignore || ignore === 0) {
    expect(result.stdout).to.match(new RegExp("Ignored:\\s+" + ignore + "\n"));
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
    summaryArgument: _.wrap(result, summaryArgument),
    summaryCounts: _.wrap(result, summaryCounts),
    summaryFailed: _.wrap(result, summaryFailed),
    summaryFocused: _.wrap(result, summaryFocused),
    summaryInconclusive: _.wrap(result, summaryInconclusive),
    summaryPartial: _.wrap(result, summaryPartial),
    summaryPassed: _.wrap(result, summaryPassed)
  };
}