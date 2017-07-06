import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

import {createLogger, Logger} from "./logger";

export interface Dependencies {
  [index: string]: string;
}

export interface ElmPackageJson {
  dependencies: Dependencies;
  sourceDirectories: string[];
}

export interface ElmPackageHelper {
  path(elmPackageJsonDirectory: string): string;
  read(elmPackageJsonDirectory: string): ElmPackageJson | undefined;
  write(elmPackageJsonDirectory: string, elmPackage: ElmPackageJson): void;
}

export class ElmPackageHelperImp implements ElmPackageHelper {

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public path(elmPackageJsonDirectory: string): string {
    return path.join(elmPackageJsonDirectory, "elm-package.json");
  }

  public read(elmPackageJsonDirectory: string): ElmPackageJson | undefined {
    try {
      let packagePath = this.path(elmPackageJsonDirectory);
      let raw = fs.readFileSync(packagePath);
      let json = JSON.parse(raw.toString());
      json.sourceDirectories = json["source-directories"];
      delete json["source-directories"];

      return json;
    } catch (err) {
      this.logger.debug(err);
      return undefined;
    }
  }

  public write(elmPackageJsonDirectory: string, elmPackage: ElmPackageJson): void {
    let packagePath = this.path(elmPackageJsonDirectory);
    let data: object = _.clone(elmPackage);
    (<{[key: string]: string[]}>data)["source-directories"] = elmPackage.sourceDirectories;
    delete (<ElmPackageJson>data).sourceDirectories;
    fs.writeFileSync(packagePath, JSON.stringify(data, null, 4));
  }
}

export function createElmPackageHelper(): ElmPackageHelper {
  return new ElmPackageHelperImp(createLogger());
}