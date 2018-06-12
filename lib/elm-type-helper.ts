import {ElmTypeInfo} from "./plugin";

export interface ElmModuleTypeInfo {
  alias?: string;
  exposing: ElmTypeInfo[];
  name: string;
}

export interface ElmTypeHelper {
  addModule(name: string, alias: string | undefined): void;
  findAllChildTypes(moduleName: string, parentTypeName: string | undefined): ElmTypeInfo[];
  resolve(name: string, parentTypeName: string | undefined, moduleName: string): ElmTypeInfo;
  resolveType(name: string): ElmTypeInfo | undefined;
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
    // types not declared in Basics but assumed to exist
    const unlistedTypes = [{name: "Bool", values: ["False", "True"]}, "Float", "Int"];

    // ref: http://package.elm-lang.org/packages/elm-lang/core/latest/
    let basicsExposing = [
      "==", "/=", "<", ">", "<=", " >=", " max", "min", {name: "Order", values: ["LT", "EQ", "GT"]}, "compare", "not", "&&", "||",
      "xor", "+", "-", "*", "/", "^", "//", "remainderBy", "modBy", "negate", "abs", "sqrt", "clamp", "logBase", "e", "pi", "cos", "sin",
      "tan", "acos", "asin", "atan", "atan2", "round", "floor", "ceiling", "truncate", "toFloat", "degrees", "radians", "turns", "toPolar",
      "fromPolar", "isNaN", "isInfinite", "toString", "++", "identity", "always", "<|", "|>", "<<", ">>", "Never", "never"
    ];
    basicsExposing.push(...unlistedTypes);
    this.addDefaultModule("Basics", undefined, basicsExposing);
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

  public resolve(name: string, parentTypeName: string | undefined, moduleName: string | undefined): ElmTypeInfo {
    let existingType = this.resolveExistingType(name, moduleName);

    if (existingType) {
      return existingType;
    }

    let module: ElmModuleTypeInfo;

    if (moduleName) {
      module = this.resolveModule(moduleName);
    } else {
      module = this.resolveModule(this.defaultModuleName);
    }

    const type = this.toModuleTypeInfo(name, parentTypeName, moduleName);
    module.exposing.push(type);

    return type;
  }

  public resolveExistingType(name: string, moduleName?: string): ElmTypeInfo | undefined {
    for (const module of this.modules) {
      for (const exposed of module.exposing) {
        if (moduleName === undefined || moduleName === exposed.moduleName) {
          if (exposed.name === name) {
            return exposed;
          }
        }
      }
    }

    return undefined;
  }

  public resolveModule(moduleName: string): ElmModuleTypeInfo {
    let module: ElmModuleTypeInfo | undefined;

    if (moduleName) {
      module = this.resolveExistingModule(moduleName);
    } else {
      module = this.resolveExistingModule(this.defaultModuleName);
    }

    if (!module) {
      module = {alias: undefined, exposing: [], name: moduleName};
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

  public resolveType(name: string): ElmTypeInfo | undefined {
    if (!name) {
      return undefined;
    }

    let parts = name.split(".");

    if (parts.length <= 1) {
      return this.resolve(name, undefined, undefined);
    }

    let typeName = parts.pop()!;
    let parentName: string | undefined = undefined;
    let moduleName: string | undefined = undefined;

    while (parts.length > 0) {
      if (moduleName === undefined) {
        moduleName = name.substring(0, name.length - typeName.length - 1);
      } else {
        parentName = parentName === undefined ? parts.pop()! : parts.pop() + "." + parentName;
        moduleName = name.substring(0, name.length - parentName.length - typeName.length - 2);
      }

      const module = this.resolveExistingModule(moduleName);

      if (module) {
        return this.resolve(typeName, parentName, module.name);
      }
    }

    return this.resolve(typeName, parentName, moduleName);
  }

  public toModuleTypeInfo(name: string, parentTypeName?: string, moduleName?: string): ElmTypeInfo {
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
