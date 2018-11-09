import {Version} from "./plugin";

export class VersionImp implements Version {

  public readonly major: number;
  public readonly minor: number;
  public readonly patch: number;

  constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  public isEqual(version: Version): boolean {
    if (!version) {
      return false;
    }

    return this.major === version.major && this.minor === version.minor && this.patch === version.patch;
  }

  public isGreaterThan(version: Version): boolean {
    if (!version) {
      return false;
    }

    return this.major > version.major || this.minor > version.minor || this.patch > version.patch;
  }

  public isLessThan(version: Version): boolean {
    if (!version) {
      return false;
    }

    return this.major < version.major || this.minor < version.minor || this.patch < version.patch;
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}

export function makeVersion(major: number, minor: number, patch: number): Version {
  return new VersionImp(major, minor, patch);
}
