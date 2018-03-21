import {createLogger, Logger} from "./logger";
import {CodeLocation, createElmTokenizer, ElmToken, ElmTokenizer, ElmTokenType} from "./elm-tokenizer";
import {createElmCodeHelper, ElmCodeHelper} from "./elm-code-helper";
import {createElmTypeHelper, ElmTypeHelper, TypeInfo} from "./elm-type-helper";

export type ElmNode = ElmImportNode
  | ElmPortNode
  | ElmTypeNode
  | ElmTypeAliasNode
  | ElmTypedModuleFunctionNode
  | ElmUntypedModuleFunctionNode;

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
  exposing: TypeInfo[];
}

export interface ElmModuleNode extends BaseElmNode {
  children: ElmNode[];
  filePath: string;
  exposing: TypeInfo[];
}

export interface ElmPortNode extends BaseElmNode {
}

export interface ElmTypeNode extends BaseElmNode {
  dependencies: TypeInfo[];
}

export interface ElmTypeAliasNode extends BaseElmNode {
}

export interface ElmTypedModuleFunctionNode extends BaseElmNode {
  dependencies: TypeInfo[];
  returnType: TypeInfo;
}

export interface ElmUntypedModuleFunctionNode extends BaseElmNode {
  dependencies: TypeInfo[];
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
  parse(filePath: string): ElmModuleNode | undefined;
}

export class ElmParserImp implements ElmParser {

  private elmTokenizer: ElmTokenizer;
  private logger: Logger;

  constructor(elmTokenizer: ElmTokenizer, logger: Logger) {
    this.elmTokenizer = elmTokenizer;
    this.logger = logger;
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
    const moduleToken = tokenLookup[ElmTokenType.Module][0];

    if (!moduleToken) {
      this.logger.debug("Unable to find module token");
      return undefined;
    }

    const typeHelper = createElmTypeHelper(moduleToken.identifier);
    const firstPassResult = this.parseFirstPass(typeHelper, tokenLookup);
    const children = firstPassResult.complete;
    const secondPassResult = this.parseSecondPass(firstPassResult.partial, typeHelper);
    children.push(...secondPassResult);

    return this.toModuleNode(filePath, typeHelper, moduleToken, children);
  }

  public parseFirstPass(typeHelper: ElmTypeHelper, tokenLookup: { [p: number]: ElmToken[] }): ElmNodeResultList {
    const tokenConverters: Array<[ElmTokenType, (token: ElmToken) => ElmNodeResult<ElmNode>]> = [];
    tokenConverters.push([ElmTokenType.Import, token => this.toImportNode(typeHelper, token)]);
    tokenConverters.push([ElmTokenType.Type, token => this.toTypeNode(token, typeHelper)]);
    tokenConverters.push([ElmTokenType.TypeAlias, token => this.toTypeAliasNode(token)]);
    tokenConverters.push([ElmTokenType.Port, token => this.toPortNode(token)]);
    tokenConverters.push([ElmTokenType.TypedModuleFunction, token => this.toTypedModuleFunctionNode(token, typeHelper)]);
    tokenConverters.push([ElmTokenType.UntypedModuleFunction, token => this.toUntypedModuleFunctionNode(token, typeHelper)]);

    const complete: ElmNode[] = [];
    const partial: ElmNodeResult<ElmNode>[] = [];

    for (const [tokenType, converter] of tokenConverters) {
      const tokens = tokenLookup[tokenType];

      if (tokens) {
        for (const token of tokens) {
          const result = converter(token);
          complete.push(result.node);
          partial.push(result);
        }
      }
    }

    return {complete, partial};
  }

  public parseSecondPass(partial: ElmNodeResult<ElmNode>[], typeHelper: ElmTypeHelper): ElmNode[] {
    let complete: ElmNode[] = [];

    for (let j = 0; j < partial.length; j++) {
      const result = partial[j];

      if (this.isTypedModuleFunctionNode(result.node) || this.isUntypedModuleFunctionNode(result.node)) {
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

  public parseFunction(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, startIndex: number): TypeInfo[] {
    const functionStartIndex = codeHelper.findChar(startIndex, "=");

    if (!functionStartIndex) {
      return [];
    }

    const keywords = ["if", "then", "else", "case", "of", "let", "in", "type", "module", "where", "import", "exposing", "as", "port"];
    const types: TypeInfo[] = [];
    let nextIndex = functionStartIndex;

    while (nextIndex < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true);

      if (next.word !== " " && next.word !== "\n" && keywords.indexOf(next.word) === -1) {
         let typeInfo = typeHelper.resolveType(next.word);

         if (typeInfo) {
           types.push(typeInfo);
         }
      }

      nextIndex = next.nextIndex;
    }

    return types;
  }

  public parseReturnType(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, functionName: string, startIndex: number)
  : TypeInfo | undefined {
    let nextIndex = startIndex;
    let lastType: string = "";

    while (nextIndex < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true);

      if (next.word !== " " && next.word !== "\n") {
        if (next.word === functionName) {
          return typeHelper.resolveType(lastType);
        }

        lastType = next.word;
      }

      nextIndex = next.nextIndex;
    }

    this.logger.debug("Failed to find return type of typed function " + functionName);

    return undefined;
  }

  public parseType(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, parentTypeName: string, startIndex: number): TypeInfo[] {
    const typeListStartIndex = codeHelper.findChar(startIndex, "=");

    if (!typeListStartIndex) {
      return [];
    }

    const types: TypeInfo[] = [];

    let nextIndex = typeListStartIndex + 1;
    let afterPipe: boolean = true;

    while (nextIndex < codeHelper.maxIndex) {
      const next = codeHelper.findNextWord(nextIndex, true);

      if (next.word !== " " && next.word !== "\n") {
        if (next.word === "|") {
          afterPipe = true;
        } else if (afterPipe) {
          types.push(typeHelper.resolveType(next.word, parentTypeName));
          afterPipe = false;
        }
      }

      nextIndex = next.nextIndex;
    }

    return types;
  }

  public parseTypeList(codeHelper: ElmCodeHelper, typeHelper: ElmTypeHelper, parentTypeName: string, startIndex: number): TypeInfo[] {
    const exposingStartIndex = codeHelper.findChar(startIndex, "(");

    if (!exposingStartIndex) {
      return [];
    }

    const types: TypeInfo[] = [];
    let nextIndex = exposingStartIndex + 1;
    let currentParentTypeName = parentTypeName;

    while (nextIndex < codeHelper.maxIndex) {
      let next = codeHelper.findNextWord(nextIndex, true, [" ", "\n", ",", ")"]);

      if (next.word !== " " && next.word !== "\n" && next.word !== ",") {
        if (next.word === "(") {
          currentParentTypeName = types[types.length - 1].name;
        } else if (next.word[0] === ")") {
          currentParentTypeName = parentTypeName;
        } else if (next.word === "..") {
          const allTypes = typeHelper.findAllChildTypes(currentParentTypeName);
          types.push(...allTypes);
        } else {
          types.push(typeHelper.resolveType(next.word, currentParentTypeName));
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

    const codeHelper = createElmCodeHelper(token.code);
    const exposing = this.parseTypeList(codeHelper, typeHelper, result.name, startOffset);
    let node = {...this.toBaseNode(token, result.name), alias: result.alias, exposing: exposing};

    return { codeHelper, node };
  }

  public toModuleNode(filePath: string, typeHelper: ElmTypeHelper, token: ElmToken, children: ElmNode[]): ElmModuleNode {
    const codeHelper = createElmCodeHelper(token.code);
    const exposing = this.parseTypeList(codeHelper, typeHelper, token.identifier, 8 + token.identifier.length);

    return { ...this.toBaseNode(token, token.identifier), children: children, exposing: exposing, filePath: filePath };
  }

  public toPortNode(token: ElmToken): ElmNodeResult<ElmPortNode> {
    const codeHelper = createElmCodeHelper(token.code);
    const node = { ...this.toBaseNode(token, token.identifier) };

    return { codeHelper, node };
  }

  public toTypeNode(token: ElmToken, typeHelper: ElmTypeHelper): ElmNodeResult<ElmTypeNode> {
    const codeHelper = createElmCodeHelper(token.code);
    const types = this.parseType(codeHelper, typeHelper, token.identifier, 8 + token.identifier.length);
    let node: ElmTypeNode = {...this.toBaseNode(token, token.identifier), dependencies: types};

    return { codeHelper, node };
  }

  public toTypeAliasNode(token: ElmToken): ElmNodeResult<ElmTypeAliasNode> {
    const codeHelper = createElmCodeHelper(token.code);
    const node: ElmTypeAliasNode = { ...this.toBaseNode(token, token.identifier) };

    return { codeHelper, node };
  }

  public toTypedModuleFunctionNode(token: ElmToken, typeHelper: ElmTypeHelper)
  : ElmNodeResult<ElmTypedModuleFunctionNode> | ElmNodeResult<ElmUntypedModuleFunctionNode> {
    const codeHelper = createElmCodeHelper(token.code);
    const returnType = this.parseReturnType(codeHelper, typeHelper, token.identifier, token.identifier.length + 1);

    if (!returnType) {
      return this.toUntypedModuleFunctionNode(token, typeHelper);
    }

    const dependencies = this.parseFunction(codeHelper, typeHelper, token.identifier.length);
    let node = {...this.toBaseNode(token, token.identifier), dependencies, returnType: returnType};

    return { codeHelper, node };
  }

  public toUntypedModuleFunctionNode(token: ElmToken, typeHelper: ElmTypeHelper): ElmNodeResult<ElmUntypedModuleFunctionNode> {
    const codeHelper = createElmCodeHelper(token.code);
    const dependencies = this.parseFunction(codeHelper, typeHelper, token.identifier.length);
    let node: ElmUntypedModuleFunctionNode = { ...this.toBaseNode(token, token.identifier), dependencies };

    return { codeHelper, node };
  }
}

export function createElmParser(): ElmParser {
  return new ElmParserImp(createElmTokenizer(), createLogger());
}
