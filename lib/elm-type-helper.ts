export interface ElmModuleTypeInfo {
  alias?: string;
  exposing: ElmTypeInfo[];
  name: string;
}

export interface ElmTypeInfo {
  name: string;
  parentTypeName?: string;
  moduleName: string;
}


export interface ElmTypeHelper {
  addModule(name: string, alias: string | undefined): void;
  findAllChildTypes(parentTypeName: string): ElmTypeInfo[];
  resolve(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo;
  resolveNoDefaultModuleUpdate(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo | undefined;
}

export class ElmTypeHelperImp implements ElmTypeHelper {

  private readonly modules: ElmModuleTypeInfo[];
  private readonly defaultModuleName: string;

  constructor(name: string) {
    this.defaultModuleName = name;
    this.modules = [];
    this.addDefaultImports();
  }

  public addDefaultImports(): void {
    // ref: http://package.elm-lang.org/packages/elm-lang/core/latest/
    this.addDefaultModule("Basics", undefined, [
      "==", "/=", "<", ">", "<=", " >=", " max", "min", {name: "Order", values: ["LT", "EQ", "GT"]}, "compare", "not", "&&", "||",
      "xor", "+", "-", "*", "/", "^", "//", "rem", "%", "negate", "abs", "sqrt", "clamp", "logBase", "e", "pi", "cos", "sin", "tan",
      "acos", "asin", "atan", "atan2", "round", "floor", "ceiling", "truncate", "toFloat", "degrees", "radians", "turns", "toPolar",
      "fromPolar", "isNaN", "isInfinite", "toString", "++", "identity", "always", "<|", "|>", "<<", ">>", "flip", "curry", "uncurry",
      "Never", "never"
    ]);
    this.addDefaultModule("List", undefined, ["List", "::"]);
    this.addDefaultModule("Maybe", undefined, [{name: "Maybe", values: ["Just", "Nothing"]}]);
    this.addDefaultModule("Result", undefined, [{name: "Result", values: ["Ok", "Err"]}]);
    this.addDefaultModule("String", undefined,  ["String"]);
    this.addDefaultModule("Char", undefined, ["Char"]);
    this.addDefaultModule("Tuple", undefined, []);
    this.addDefaultModule("Debug", undefined, []);
    this.addDefaultModule("Platform", undefined, ["Program"]);
    this.addDefaultModule("Platform.Cmd", "Cmd", ["Cmd", "!"]);
    this.addDefaultModule("Platform.Sub", "Sub", ["Sub"]);
  }

  public addDefaultModule(name: string, alias: string | undefined, exposing: Array<string|{name: string, values: string[]}>): void {
    const types: ElmTypeInfo[] = [];

    for (const item of exposing) {
      if (typeof item === "string") {
        types.push({name: item, moduleName: name});
      } else {
        for (const t of item.values) {
          types.push({name: t, parentTypeName: item.name, moduleName: name});
        }
      }
    }

    this.addModule(name, alias, types);
  }

  public addModule(name: string, alias: string | undefined, exposing: ElmTypeInfo[] = []): void {
    this.modules.push({name, alias, exposing});
  }

  public findAllChildTypes(name: string): ElmTypeInfo[] {
    for (const m of this.modules) {
      if (m.name === name || m.alias === name) {
        return m.exposing;
      }
    }

    return [];
  }

  public findExposedType(name: string): ElmTypeInfo | undefined {
    for (const m of this.modules) {
      for (const exposed of m.exposing) {
        if (exposed.name === name) {
          return exposed;
        }
      }
    }

    return undefined;
  }

  public resolve(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo {
    if (!moduleName) {
      const existingType = this.findExposedType(name);

      if (existingType) {
        return existingType;
      }
    }

    const type = this.toModuleTypeInfo(name, parentTypeName, moduleName);
    let module = this.resolveModule(type.moduleName);

    if (!module) {
      module = { alias: undefined, exposing: [], name: type.moduleName };
      this.modules.push(module);
    }

    let moduleType = this.resolveType(module, type);

    if (!moduleType) {
      module.exposing.push(type);
    }

    return type;
  }

  public resolveNoDefaultModuleUpdate(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo | undefined {
    if (!moduleName) {
      const existingType = this.findExposedType(name);

      if (existingType) {
        return existingType;
      }
    }

    const type = this.toModuleTypeInfo(name, parentTypeName, moduleName);
    let module = this.resolveModule(type.moduleName);

    if (!module) {
      if (type.moduleName === this.defaultModuleName) {
        return undefined;
      } else {
        module = {alias: undefined, exposing: [], name: type.moduleName};
        this.modules.push(module);
      }
    }

    let moduleType = this.resolveType(module, type);

    if (!moduleType) {
      if (type.moduleName === this.defaultModuleName) {
        return undefined;
      } else {
        module.exposing.push(type);
      }
    }

    return type;
  }

  public resolveModule(name: string): ElmModuleTypeInfo | undefined {
    for (const m of this.modules) {
      if (m.name === name || m.alias === name) {
        return m;
      }
    }

    return undefined;
  }

  public resolveType(module: ElmModuleTypeInfo, type: ElmTypeInfo): ElmTypeInfo | undefined {
    for (const exposed of module.exposing) {
      if (exposed.name === type.name) {
        return exposed;
      }
    }

    return undefined;
  }

  public toModuleTypeInfo(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo {
    const lastIndex = name.lastIndexOf(".");

    if (lastIndex > -1) {
      if (name[0] === name[0].toUpperCase()) {
        return {name: name.substring(lastIndex + 1), moduleName: name.substring(0, lastIndex)};
      }
    }

    let type: ElmTypeInfo;

    if (!moduleName) {
      type = { name, moduleName: this.defaultModuleName };
    } else {
      type = { name, moduleName };
    }

    if (parentTypeName) {
      type.parentTypeName = parentTypeName;
    }

    return type;
  }
}

export function createElmTypeHelper(name: string): ElmTypeHelper {
  return new ElmTypeHelperImp(name);
}
