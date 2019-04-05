"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import {createElmNodeHelper, ElmNodeHelper, ElmNodeHelperImp} from "../../../lib/elm-node-helper";
import {ElmTokenizer} from "../../../lib/elm-tokenizer";
import {Logger} from "../../../lib/logger";
import {makeElmCodeHelper} from "../../../lib/elm-code-helper";
import {ElmNode, ElmNodeType} from "../../../lib/plugin";

const expect = chai.expect;
chai.use(SinonChai);

describe("lib elm-node-helper", () => {
  const RewiredParser = rewire("../../../lib/elm-node-helper");
  let parserImp: ElmNodeHelperImp;
  let mockLogger: Logger;
  let mockTokenizer: ElmTokenizer;
  let mockTokenize: Sinon.SinonStub;
  let mockMakeElmCodeHelper: Sinon.SinonSpy;
  let mockMakeElmTypeHelper: Sinon.SinonStub;

  beforeEach(() => {
    const rewiredImp = RewiredParser.__get__("ElmNodeHelperImp");
    mockLogger = <Logger> {};
    mockLogger.debug = Sinon.spy();
    mockTokenizer = <ElmTokenizer> {};
    mockTokenize = Sinon.stub();
    mockTokenizer.tokenize = mockTokenize;
    mockMakeElmCodeHelper = Sinon.spy(makeElmCodeHelper);
    mockMakeElmTypeHelper = Sinon.stub();
    parserImp = new rewiredImp(mockTokenizer, mockLogger, mockMakeElmCodeHelper, mockMakeElmTypeHelper);
  });

  describe("createElmNodeHelper", () => {
    it("should return elm parser", () => {
      // act
      const actual: ElmNodeHelper = createElmNodeHelper();

      // assert
      expect(actual).to.exist;
    });
  });

  describe("isFunctionNode", () => {
    it("should return false when the node is not a function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.Import;

      // act
      const actual = parserImp.isFunctionNode(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the node is a typed module function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.TypedModuleFunction;

      // act
      const actual = parserImp.isFunctionNode(node);

      // assert
      expect(actual).to.be.true;
    });

    it("should return true when the node is an untyped module function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.UntypedModuleFunction;

      // act
      const actual = parserImp.isFunctionNode(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isImportNode", () => {
    it("should return false when the node is not an import node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.Unknown;

      // act
      const actual = parserImp.isImportNode(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the node is an import node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.Import;

      // act
      const actual = parserImp.isImportNode(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isTypedModuleFunctionNode", () => {
    it("should return false when the node is not a typed module function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.Unknown;

      // act
      const actual = parserImp.isTypedModuleFunctionNode(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the node is a typed module function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.TypedModuleFunction;

      // act
      const actual = parserImp.isTypedModuleFunctionNode(node);

      // assert
      expect(actual).to.be.true;
    });
  });

  describe("isUntypedModuleFunctionNode", () => {
    it("should return false when the node is not an untyped module function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.Unknown;

      // act
      const actual = parserImp.isUntypedModuleFunctionNode(node);

      // assert
      expect(actual).to.be.false;
    });

    it("should return true when the node is an untyped module function node", () => {
      // arrange
      const node = <ElmNode> {};
      node.nodeType = ElmNodeType.UntypedModuleFunction;

      // act
      const actual = parserImp.isUntypedModuleFunctionNode(node);

      // assert
      expect(actual).to.be.true;
    });
  });
});
