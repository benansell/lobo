import {createLogger, Logger} from "./logger";
import {CodeLocation, createElmTokenizer, ElmToken, ElmTokenizer, ElmTokenType} from "./elm-tokenizer";
import {makeElmCodeHelper, ElmCodeHelper} from "./elm-code-helper";
import {makeElmTypeHelper, ElmTypeHelper, ElmTypeInfo} from "./elm-type-helper";

export type ElmNode = ElmImportNode
  | ElmPortNode
  | ElmTypeNode
  | ElmTypeAliasNode
  | ElmTypedModuleFunctionNode
  | ElmUntypedModuleFunctionNode;

export type ElmFunctionNode = ElmTypedModuleFunctionNode | ElmUntypedModuleFunctionNode;

export enum ElmNodeType {
  Import = 0,
  Module,
  Port,
  Type,
  TypeAlias,
  TypedModuleFunction,
  UntypedModuleFunction,
  Unknown
}

export interface BaseElmNode {
  code: string;
  end: CodeLocation;
  name: string;
  nodeType: ElmNodeType;
  start: CodeLocation;
}

export interface ElmImportNode extends BaseElmNode {
  alias?: string;
  exposing: ElmTypeInfo[];
}

export interface ElmModuleNode extends BaseElmNode {
  children: ElmNode[];
  filePath: string;
  exposing: ElmTypeInfo[];
}

export interface ElmPortNode extends BaseElmNode {
}

export interface ElmTypeNode extends BaseElmNode {
  dependencies: ElmTypeInfo[];
}

export interface ElmTypeAliasNode extends BaseElmNode {
}

export interface ElmTypedModuleFunctionNode extends BaseElmNode {
  dependencies: ElmTypeInfo[];
  returnType: ElmTypeInfo;
}

export interface ElmUntypedModuleFunctionNode extends BaseElmNode {
  dependencies: ElmTypeInfo[];
}

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
  isFunctionNode(node: ElmNode): node is ElmFunctionNode;
  isImportNode(node: ElmNode): node is ElmImportNode;
  isTypedModuleFunctionNode(node: ElmNode): node is ElmTypedModuleFunctionNode;
  isUntypedModuleFunctionNode(node: ElmNode): node is ElmUntypedModuleFunctionNode;
  parse(filePath: string): ElmModuleNode | undefined;
}

export class ElmParserImp implements ElmParser {

  private readonly elmTokenizer: ElmTokenizer;
  private readonly logger: Logger;
  private readonly makeElmCodeHelper: (code: string) => ElmCodeHelper;
  private readonly makeElmTypeHelper: (moduleName: string) => ElmTypeHelper;

  constructor(elmTokenizer: ElmTokenizer, logger: Logger,
              makeCodeHelper: (code: string) => ElmCodeHelper, makeTypeHelper: (moduleName: string) => ElmTypeHelper) {
    this.elmTokenizer = elmTokenizer;
    this.logger = logger;
    this.makeElmCodeHelper = makeCodeHelper;
    this.makeElmTypeHelper = makeTypeHelper;
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

  public isFunctionNode(node: ElmNode): node is ElmFunctionNode {
    return this.isTypedModuleFunctionNode(node) || this.isUntypedModuleFunctionNode(node);
  }

  public isImportNode(node: ElmNode): node is ElmImportNode {
    return node.nodeType === ElmNodeType.Import;
  }

  public isTypedModuleFunctionNode(node: ElmNode): node is ElmTypedModuleFunctionNode {
    return node.nodeType === ElmNodeType.TypedModuleFunction;
  }

  public isUntypedModuleFunctionNode(node: ElmNode): node is ElmUntypedModuleFunctionNode {
    return node.nodeType === ElmNodeType.UntypedModuleFunction;
  }

  public parse(filePath: string): ElmModuleNode | undefined {
    const tokens = this.elmTokenizer.tokenize(filePath);
    const tokenLookup = this.convertToLookup(tokens);

    return this.parseTokens(filePath, tokenLookup);
  }

  public parseTokens(filePath: string, tokenLookup: TokenLookup): ElmModuleNode | undefined {
    if (!tokenLookup[ElmTokenType.Module] || tokenLookup[ElmTokenType.Module].length === 0) {
      this.logger.debug("Unable to find module token in" + filePath);
      return undefined;
    }

    const moduleToken = tokenLookup[ElmTokenType.Module][0];
    const typeHelper = this.makeElmTypeHelper(moduleToken.identifier);
    const firstPassResult = this.parseFirstPass(typeHelper, tokenLookup, moduleToken.identifier);
    const children = firstPassResult.complete;
    const secondPassResult = this.parseSecondPass(typeHelper, firstPassResult.partial);
    children.push(...secondPassResult);

    return this.toModuleNode(filePath, typeHelper, moduleToken, children);
  }

  public parseFirstPass(typeHelper: ElmTypeHelper, tokenLookup: { [p: number]: ElmToken[] }, moduleName: string): ElmNodeResultList {
    const tokenConverters: Array<[ElmTokenType, (token: ElmToken) => ElmNodeResult<ElmNode>]> = [];
    tokenConverters.push([ElmTokenType.Import, token => this.toImportNode(typeHelper, token)]);
    tokenConverters.push([ElmTokenType.Type, token => this.toTypeNode(typeHelper, moduleName, token)]);
    tokenConverters.push([ElmTokenType.TypeAlias, token => this.toTypeAliasNode(token)]);
    tokenConverters.push([ElmTokenType.Port, token => this.toPortNode(token)]);
    tokenConverters.push([ElmTokenType.TypedModuleFunction, token => this.toTypedModuleFunctionNode(typeHelper, token)]);
    tokenConverters.push([ElmTokenType.UntypedModuleFunction, token => this.toUntypedModuleFunctionNode(typeHelper, token)]);

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

      if (this.isFunctionNode(result.node)) {
        const node = result.node;
        node.dependencies = this.parseFunction(result.codeHelper, typeHelper, result.node.name, result.node.name.length);
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

  public parseFunction(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, name: string, startIndex: number): ElmTypeInfo[] {
    const functionStartIndex = codeHelper.findChar(startIndex, "=");

    if (!functionStartIndex) {
      return [];
    }

    const delimiters = [" ", "\n", "\"", ",", "=", "[", "]", "{", "}", "(", ")", "\\"];
    const keywords = ["if", "then", "else", "case", "of", "let", "in", "type", "module", "where", "import", "exposing", "as", "port"];
    const types: ElmTypeInfo[] = [];
    let nextIndex = functionStartIndex + 1;

    while (nextIndex < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true, delimiters);
      nextIndex = next.nextIndex;

      if (next.word === "\"") {
        const endStringIndex = codeHelper.findClose(next.nextIndex, "\"", "\"", false);

        if (endStringIndex) {
          nextIndex = endStringIndex + 1;
        }
      } else if (delimiters.indexOf(next.word) === -1 && keywords.indexOf(next.word) === -1) {
        let typeInfo = typeHelper.resolveExcludingDefaultModule(next.word, name);

        if (typeInfo && types.indexOf(typeInfo) === -1) {
          types.push(typeInfo);
        }
      }
    }

    return types;
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
        if (previousWord === "\n" && next.word === functionName) {
          return typeHelper.resolve(returnType);
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
      let next = codeHelper.findNextWord(nextIndex, true, [" ", "\n", ",", "(", ")"]);

      if (next.word !== " " && next.word !== "\n" && next.word !== ",") {
        if (next.word === "(") {
          currentParentTypeName = types[types.length - 1].name;
        } else if (next.word[0] === ")") {
          currentParentTypeName = undefined;
        } else if (currentParentTypeName !== undefined && next.word === "..") {
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

  public toModuleNode(filePath: string, typeHelper: ElmTypeHelper, token: ElmToken, children: ElmNode[]): ElmModuleNode {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const exposing = this.parseTypeList(codeHelper, typeHelper, token.identifier, 8 + token.identifier.length);

    return {...this.toBaseNode(token, token.identifier), children: children, exposing: exposing, filePath: filePath};
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

  public toTypedModuleFunctionNode(typeHelper: ElmTypeHelper, token: ElmToken)
    : ElmNodeResult<ElmTypedModuleFunctionNode> | ElmNodeResult<ElmUntypedModuleFunctionNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    const returnType = this.parseReturnType(codeHelper, typeHelper, token.identifier, token.identifier.length);

    if (!returnType) {
      return this.toUntypedModuleFunctionNode(typeHelper, token);
    }

    typeHelper.resolve(token.identifier);
    let node = {...this.toBaseNode(token, token.identifier), dependencies: [], returnType: returnType};

    return {codeHelper, node};
  }

  public toUntypedModuleFunctionNode(typeHelper: ElmTypeHelper, token: ElmToken): ElmNodeResult<ElmUntypedModuleFunctionNode> {
    const codeHelper = this.makeElmCodeHelper(token.code);
    typeHelper.resolve(token.identifier);
    let node: ElmUntypedModuleFunctionNode = {...this.toBaseNode(token, token.identifier), dependencies: []};

    return {codeHelper, node};
  }
}

export function createElmParser(): ElmParser {
  return new ElmParserImp(createElmTokenizer(), createLogger(), makeElmCodeHelper, makeElmTypeHelper);
}
