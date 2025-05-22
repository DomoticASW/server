import { Brand } from "../../utils/Brand.js";
import { ConstantInstruction, IfElseInstruction, IfInstruction } from "./Instruction.js";

interface Constant {
  constantInstruction: ConstantInstruction<unknown>,
  scopeNode: NodeRef
}

export type ConstantRef = Brand<Constant, "ConstantRef">

interface IfRef {
  instruction: IfInstruction
}

interface IfElseRef {
  instruction: IfElseInstruction
}

export type NodeRef = RootNodeRef | ThenNodeRef | ElseNodeRef

export type RootNodeRef = Brand<unknown, "RootNodeRef">
export type ThenNodeRef = Brand<IfRef, "ThenNodeRef">
export type ElseNodeRef = Brand<IfElseRef, "ElseNodeRef">


export function ConstantRef(constantInstruction: ConstantInstruction<unknown>, scopeNode: NodeRef): ConstantRef {
  return {
    constantInstruction: constantInstruction,
    scopeNode: scopeNode,
    __brand: "ConstantRef"
  }
}

class RootNodeRefImpl implements RootNodeRef {
  scopeLevel: number = 0
  superNode: NodeRef = this
  __brand = "RootNodeRef" as const;
}

export function RootNodeRef(): RootNodeRef {
  return new RootNodeRefImpl()
}

export function ThenNodeRef(ifInstruction: IfInstruction): ThenNodeRef {
  return {
    instruction: ifInstruction,
    __brand: "ThenNodeRef"
  }
}

export function ElseNodeRef(ifElseInstruction: IfElseInstruction): ElseNodeRef {
  return {
    instruction: ifElseInstruction,
    __brand: "ElseNodeRef"
  }
}