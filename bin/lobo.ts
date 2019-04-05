#!/usr/bin/env node

import * as main from "../lib/main";

export function run(returnFakeLobo: boolean): void {
  process.title = "lobo";
  const lobo = main.createLobo(returnFakeLobo);

  process.on("uncaughtException", err => {
    lobo.handleUncaughtException(err);
  });

  lobo.execute();
}

run((<{__loboUnitTest__: boolean}><{}>global).__loboUnitTest__);
