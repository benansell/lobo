import {ElmFunctionNode, ElmImportNode, ElmNode, ElmNodeType, ElmTypedModuleFunctionNode, ElmUntypedModuleFunctionNode} from "./plugin";

export interface ElmNodeHelper {
  isFunctionNode(node: ElmNode): node is ElmFunctionNode;
  isImportNode(node: ElmNode): node is ElmImportNode;
  isTypedModuleFunctionNode(node: ElmNode): node is ElmTypedModuleFunctionNode;
  isUntypedModuleFunctionNode(node: ElmNode): node is ElmUntypedModuleFunctionNode;
}

export class ElmNodeHelperImp implements ElmNodeHelper {

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
}

export function createElmNodeHelper(): ElmNodeHelper {
  return new ElmNodeHelperImp();
}
