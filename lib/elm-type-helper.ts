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
  findAllChildTypes(moduleName: string, parentTypeName: string | undefined): ElmTypeInfo[];
  resolve(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo;
  resolveExcludingDefaultModule(name: string, parentTypeName?: string): ElmTypeInfo | undefined;
}

export class ElmTypeHelperImp implements ElmTypeHelper {

  private readonly modules: ElmModuleTypeInfo[];
  private readonly defaultModuleName: string;

  constructor(name: string) {
    this.defaultModuleName = name;
    this.modules = [{alias: undefined, exposing: [], name}];
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

  public findAllChildTypes(moduleName: string, parentTypeName: string | undefined): ElmTypeInfo[] {
    const module = this.resolveExistingModule(moduleName);

    if (!module) {
      return [];
    }

    if (!parentTypeName) {
      return module.exposing;
    }

    const types: ElmTypeInfo[] = [];

    for (const t of module.exposing) {
      if (t.parentTypeName === parentTypeName) {
        types.push(t);
      }
    }

    return types;
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
    const type = this.toModuleTypeInfo(name, parentTypeName, moduleName);
    const result = this.resolveInternal(true, type);

    return result.type;
  }

  public resolveExcludingDefaultModule(name: string, parentTypeName?: string): ElmTypeInfo | undefined {
    const type = this.toModuleTypeInfo(name, parentTypeName, undefined);
    const result = this.resolveInternal(false, type);

    if (result.existing || result.type.moduleName !== this.defaultModuleName) {
      return result.type;
    }

    return undefined;
  }

  public resolveInternal(addToDefaultModule: boolean, type: ElmTypeInfo): {existing: boolean, type: ElmTypeInfo} {
    if (type.moduleName === this.defaultModuleName) {
      const existingType = this.findExposedType(type.name);

      if (existingType) {
        return { existing: true, type: existingType};
      }
    }

    const module = this.resolveModule(type);
    let moduleType = this.resolveType(module, type);

    if (moduleType) {
      return { existing: true, type: moduleType };
    }

    if (addToDefaultModule || type.moduleName !== this.defaultModuleName) {
      module.exposing.push(type);
    }

    return { existing: false, type };
  }

  public resolveModule(type: ElmTypeInfo): ElmModuleTypeInfo {
    let module = this.resolveExistingModule(type.moduleName);

    if (!module) {
      module = {alias: undefined, exposing: [type], name: type.moduleName};
      this.modules.push(module);
    }

    return module;
  }

  public resolveExistingModule(name: string): ElmModuleTypeInfo | undefined {
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

export function makeElmTypeHelper(name: string): ElmTypeHelper {
  return new ElmTypeHelperImp(name);
}
