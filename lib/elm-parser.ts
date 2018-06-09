import {createLogger, Logger} from "./logger";
import {createElmTokenizer, ElmToken, ElmTokenizer, ElmTokenType} from "./elm-tokenizer";
import {makeElmCodeHelper, ElmCodeHelper} from "./elm-code-helper";
import {makeElmTypeHelper, ElmTypeHelper} from "./elm-type-helper";
import {
  BaseElmNode, ElmFunctionDependency,
  ElmImportNode,
  ElmModuleNode,
  ElmNode,
  ElmNodeType, ElmPortNode, ElmTypeAliasNode,
  ElmTypedModuleFunctionNode, ElmTypeInfo, ElmTypeNode,
  ElmUntypedModuleFunctionNode
} from "./plugin";
import {createElmNodeHelper, ElmNodeHelper} from "./elm-node-helper";

export interface ImportName {
  alias?: string;
  name: string;
}

export interface TokenLookup {
  [id: number]: ElmToken[];
}

export interface ElmNodeResult<T> {
  codeHelper: ElmCodeHelper;
  node: T;
}

export interface ElmNodeResultList {
  complete: ElmNode[];
  partial: ElmNodeResult<ElmNode>[];
}

export interface ElmParser {
  parse(filePath: string, testFrameworkElmModuleName: string): ElmModuleNode | undefined;
}

export class ElmParserImp implements ElmParser {

  private readonly elmNodeHelper: ElmNodeHelper;
  private readonly elmTokenizer: ElmTokenizer;
  private readonly logger: Logger;
  private readonly makeElmCodeHelper: (code: string) => ElmCodeHelper;
  private readonly makeElmTypeHelper: (moduleName: string) => ElmTypeHelper;

  constructor(elmNodeHelper: ElmNodeHelper, elmTokenizer: ElmTokenizer, logger: Logger,
              makeCodeHelper: (code: string) => ElmCodeHelper, makeTypeHelper: (moduleName: string) => ElmTypeHelper) {
    this.elmNodeHelper = elmNodeHelper;
    this.elmTokenizer = elmTokenizer;
    this.logger = logger;
    this.makeElmCodeHelper = makeCodeHelper;
    this.makeElmTypeHelper = makeTypeHelper;
  }

  public buildElmTypeHelper(moduleName: string, testFrameworkElmModuleName: string): ElmTypeHelper {
    const typeHelper = this.makeElmTypeHelper(moduleName);
    typeHelper.resolve("Test", undefined, testFrameworkElmModuleName);
    typeHelper.resolve("concat", undefined, testFrameworkElmModuleName);
    typeHelper.resolve("describe", undefined, testFrameworkElmModuleName);
    typeHelper.resolve("fuzz", undefined, testFrameworkElmModuleName);
    typeHelper.resolve("test", undefined, testFrameworkElmModuleName);

    return typeHelper;
  }

  public convertToLookup(tokens: ElmToken[]): TokenLookup {
    const tokenLookup = tokens.reduce(
      (acc: TokenLookup, value: ElmToken) => {
        if (!acc[value.tokenType]) {
          acc[value.tokenType] = [];
        }

        acc[value.tokenType].push(value);
        return acc;
      },
      {});

    return tokenLookup;
  }

  public parse(filePath: string, testFrameworkElmModuleName: string): ElmModuleNode | undefined {
    const tokens = this.elmTokenizer.tokenize(filePath);
    const tokenLookup = this.convertToLookup(tokens);

    if (!tokenLookup[ElmTokenType.Module] || tokenLookup[ElmTokenType.Module].length === 0) {
      this.logger.debug("Unable to find module token in" + filePath);
      return undefined;
    }

    return this.parseTokens(tokenLookup, testFrameworkElmModuleName);
  }

  public parseTokens(tokenLookup: TokenLookup, testFrameworkElmModuleName: string): ElmModuleNode | undefined {
    const moduleToken = tokenLookup[ElmTokenType.Module][0];
    const typeHelper = this.buildElmTypeHelper(moduleToken.identifier, testFrameworkElmModuleName);
    const firstPassResult = this.parseFirstPass(typeHelper, tokenLookup, moduleToken.identifier);
    const children = firstPassResult.complete;
    const secondPassResult = this.parseSecondPass(typeHelper, firstPassResult.partial);
    children.push(...secondPassResult);

    return this.toModuleNode(typeHelper, moduleToken, children);
  }

  public parseFirstPass(typeHelper: ElmTypeHelper, tokenLookup: { [p: number]: ElmToken[] }, moduleName: string): ElmNodeResultList {
    const tokenConverters: Array<[ElmTokenType, (token: ElmToken) => ElmNodeResult<ElmNode>]> = [];
    tokenConverters.push([ElmTokenType.Import, token => this.toImportNode(typeHelper, token)]);
    tokenConverters.push([ElmTokenType.Type, token => this.toTypeNode(typeHelper, moduleName, token)]);
    tokenConverters.push([ElmTokenType.TypeAlias, token => this.toTypeAliasNode(token)]);
    tokenConverters.push([ElmTokenType.Port, token => this.toPortNode(token)]);
    tokenConverters.push([ElmTokenType.TypedModuleFunction, token => this.toTypedModuleFunctionNode(typeHelper, moduleName, token)]);
    tokenConverters.push([ElmTokenType.UntypedModuleFunction, token => this.toUntypedModuleFunctionNode(typeHelper, moduleName, token)]);

    const complete: ElmNode[] = [];
    const partial: ElmNodeResult<ElmNode>[] = [];

    for (const [tokenType, converter] of tokenConverters) {
      const tokens = tokenLookup[tokenType];

      if (tokens) {
        for (const token of tokens) {
          const result = converter(token);
          if (token.tokenType === ElmTokenType.TypedModuleFunction || token.tokenType === ElmTokenType.UntypedModuleFunction) {
            partial.push(result);
          } else {
            complete.push(result.node);
          }
        }
      }
    }

    return {complete, partial};
  }

  public parseSecondPass(typeHelper: ElmTypeHelper, partial: ElmNodeResult<ElmNode>[]): ElmNode[] {
    let complete: ElmNode[] = [];

    for (let j = 0; j < partial.length; j++) {
      const result = partial[j];

      if (this.elmNodeHelper.isFunctionNode(result.node)) {
        const node = result.node;
        node.dependencies = this.parseFunction(result.codeHelper, typeHelper, result.node.name.length);
        complete.push(node);
      }
    }

    return complete;
  }

  public parseAlias(identifier: string): ImportName {
    const index = identifier.indexOf(" as ");

    if (index === -1) {
      return {alias: undefined, name: identifier};
    }

    return {alias: identifier.substring(index + 4), name: identifier.substring(0, index)};
  }

  public parseArguments(codeHelper: ElmCodeHelper, identifier: string, isTypedFunction: boolean): string[] {
    const functionStartIndex = codeHelper.findChar(identifier.length, "=");

    if (functionStartIndex === undefined) {
      return [];
    }

    const args: string[] = [];
    const delimiters = [" ", "\n", "=", ",", "(", ")", "{", "}"];
    let nextIndex = identifier.length + 1;
    let beforeFunctionDeclaration = isTypedFunction;

    while (nextIndex < functionStartIndex) {
      let next = codeHelper.findNextWord(nextIndex, true, delimiters);

      if (beforeFunctionDeclaration) {
        if (next.word === identifier) {
          beforeFunctionDeclaration = false;
        }

        nextIndex = next.nextIndex;
        continue;
      }

      if (delimiters.indexOf(next.word) === -1) {
        args.push(next.word);
      }

      nextIndex = next.nextIndex;
    }

    return args;
  }

  public parseFunction(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, startIndex: number): ElmFunctionDependency[] {
    const functionStartIndex = codeHelper.findChar(startIndex, "=");

    if (!functionStartIndex) {
      return [];
    }

    const keywords = ["if", "then", "else", "case", "of", "let", "in", "type", "module", "where", "import", "exposing", "as", "port"];
    const dependencies: ElmFunctionDependency[] = [];
    let nextIndex = functionStartIndex + 1;

    while (nextIndex < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true, codeHelper.delimitersFunction);
      nextIndex = next.nextIndex;

      if (next.word === "\"") {
        const endStringIndex = codeHelper.findClose(next.nextIndex, "\"", "\"", false);

        if (endStringIndex) {
          nextIndex = endStringIndex + 1;
        } else {
          nextIndex = codeHelper.maxIndex;
        }
      } else if (codeHelper.delimitersFunction.indexOf(next.word) === -1 && keywords.indexOf(next.word) === -1) {
        let typeInfo = typeHelper.resolveType(next.word);

        if (typeInfo) {
          let dep: ElmFunctionDependency | undefined = undefined;

          for (const d of dependencies) {
            if (d.typeInfo.moduleName === typeInfo.moduleName
              && d.typeInfo.parentTypeName === typeInfo.parentTypeName
              && d.typeInfo.name === typeInfo.name) {
              dep = d;
            }
          }

          const occursIndex = nextIndex - typeInfo.name.length;

          if (!dep) {
            dependencies.push(<ElmFunctionDependency>{occurs: [occursIndex], typeInfo});
          } else {
            dep.occurs.push(occursIndex);
          }
        }
      }
    }

    return dependencies;
  }

  public parseReturnType(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, functionName: string, startIndex: number)
    : ElmTypeInfo | undefined {
    let nextIndex = startIndex;
    let returnType: string = "";
    let previousWord: string = "";

    while (nextIndex < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true, [" ", "\n", ":"]);

      if (next.word !== " " && next.word !== "\n") {
        if (previousWord === ":") {
          returnType = next.word;
        }

        if (returnType !== "" && previousWord === "\n" && next.word === functionName) {
          return typeHelper.resolveType(returnType);
        }
      }

      if (next.word !== " ") {
        previousWord = next.word;
      }

      nextIndex = next.nextIndex;
    }

    this.logger.debug("Failed to find return type of typed function " + functionName);

    return undefined;
  }

  public parseType(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, moduleName: string, parentTypeName: string, startIndex: number)
    : ElmTypeInfo[] {
    const typeListStartIndex = codeHelper.findChar(startIndex, "=");

    if (!typeListStartIndex) {
      return [];
    }

    const types: ElmTypeInfo[] = [];
    let nextIndex = typeListStartIndex + 1;
    let afterPipe: boolean = true;

    while (nextIndex <= codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true);

      if (next.word !== " " && next.word !== "\n") {
        if (next.word === "|") {
          afterPipe = true;
        } else if (afterPipe) {
          types.push(typeHelper.resolve(next.word, parentTypeName, moduleName));
          afterPipe = false;
        }
      }

      nextIndex = next.nextIndex;
    }

    return types;
  }

  public parseTypeList(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, moduleName: string, startIndex: number): ElmTypeInfo[] {
    const exposingStartIndex = codeHelper.findChar(startIndex, "(");

    if (!exposingStartIndex) {
      return [];
    }

    const types: ElmTypeInfo[] = [];
    let nextIndex = exposingStartIndex + 1;
    let currentParentTypeName = undefined;

    while (nextIndex < codeHelper.maxIndex) {
      let next = codeHelper.findNextWord(nextIndex, true, codeHelper.delimitersTypeList);

      if (next.word !== " " && next.word !== "\n" && next.word !== ",") {
        if (next.word === "(") {
          currentParentTypeName = types[types.length - 1].name;
        } else if (next.word[0] === ")") {
          currentParentTypeName = undefined;
        } else if (next.word === "..") {
          const allTypes = typeHelper.findAllChildTypes(moduleName, currentParentTypeName);
          types.push(...allTypes);
        } else {
          types.push(typeHelper.resolve(next.word, currentParentTypeName, moduleName));
        }
      }

      nextIndex = next.nextIndex;
    }

    return types;
  }

  public toBaseNode(token: ElmToken, name: string): BaseElmNode {
    return <BaseElmNode> {
      code: token.code,
      end: token.end,
      name: name,
      nodeType: this.toNodeType(token.tokenType),
      start: token.start
    };
  }

  public toNodeType(tokenType: ElmTokenType): ElmNodeType {
    switch (tokenType) {
      case ElmTokenType.Import:
        return ElmNodeType.Import;
      case ElmTokenType.Module:
        return ElmNodeType.Module;
      case ElmTokenType.Port:
        return ElmNodeType.Port;
      case ElmTokenType.Type:
        return ElmNodeType.Type;
      case ElmTokenType.TypeAlias:
        return ElmNodeType.TypeAlias;
      case ElmTokenType.TypedModuleFunction:
        return ElmNodeType.TypedModuleFunction;
      case ElmTokenType.UntypedModuleFunction:
        return ElmNodeType.UntypedModuleFunction;
      default:
        return ElmNodeType.Unknown;
    }
  }

  public toImportNode(typeHelper: ElmTypeHelper, token: ElmToken): ElmNodeResult<ElmImportNode> {
    let startOffset = 8 + token.identifier.length;
    const result = this.parseAlias(token.identifier);

    if (result.alias) {
      startOffset += result.alias.length;
    }

    typeHelper.addModule(result.name, result.alias);
    const codeHelper = this.makeElmCodeHelper(token.code);
    const exposing = this.parseTypeList(codeHelper, typeHelper, result.name, startOffset);
    let node = {...this.toBaseNode(token, result.name), alias: result.alias, exposing: exposing};

    return {codeHelper, node};
  }

  public toModuleNode(typeHelper: ElmTypeHelper, token: ElmToken, children: ElmNode[]): ElmModuleNode {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const exposing = this.parseTypeList(codeHelper, typeHelper, token.identifier, 8 + token.identifier.length);

    return {...this.toBaseNode(token, token.identifier), children: children, exposing: exposing};
  }

  public toPortNode(token: ElmToken): ElmNodeResult<ElmPortNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const node = {...this.toBaseNode(token, token.identifier)};

    return {codeHelper, node};
  }

  public toTypeNode(typeHelper: ElmTypeHelper, moduleName: string, token: ElmToken): ElmNodeResult<ElmTypeNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const types = this.parseType(codeHelper, typeHelper, moduleName, token.identifier, 5 + token.identifier.length);
    let node: ElmTypeNode = {...this.toBaseNode(token, token.identifier), dependencies: types};

    return {codeHelper, node};
  }

  public toTypeAliasNode(token: ElmToken): ElmNodeResult<ElmTypeAliasNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const node: ElmTypeAliasNode = {...this.toBaseNode(token, token.identifier)};

    return {codeHelper, node};
  }

  public toTypedModuleFunctionNode(typeHelper: ElmTypeHelper, moduleName: string, token: ElmToken)
    : ElmNodeResult<ElmTypedModuleFunctionNode> | ElmNodeResult<ElmUntypedModuleFunctionNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const returnType = this.parseReturnType(codeHelper, typeHelper, token.identifier, token.identifier.length);

    if (!returnType) {
      token.tokenType = ElmTokenType.UntypedModuleFunction;
      return this.toUntypedModuleFunctionNode(typeHelper, moduleName, token);
    }

    const args = this.parseArguments(codeHelper, token.identifier, true);
    typeHelper.resolve(token.identifier, undefined, moduleName);
    let node = {...this.toBaseNode(token, token.identifier), arguments: args, dependencies: [], returnType: returnType};

    return {codeHelper, node};
  }

  public toUntypedModuleFunctionNode(typeHelper: ElmTypeHelper, moduleName: string, token: ElmToken)
    : ElmNodeResult<ElmUntypedModuleFunctionNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const args = this.parseArguments(codeHelper, token.identifier, false);
    typeHelper.resolve(token.identifier, undefined, moduleName);
    let node: ElmUntypedModuleFunctionNode = {...this.toBaseNode(token, token.identifier), arguments: args, dependencies: []};

    return {codeHelper, node};
  }
}

export function createElmParser(): ElmParser {
  return new ElmParserImp(createElmNodeHelper(), createElmTokenizer(), createLogger(), makeElmCodeHelper, makeElmTypeHelper);
}
