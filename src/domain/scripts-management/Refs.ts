import { Brand } from "../../utils/Brand.js";
import { ConstantInstruction, IfElseInstruction, IfInstruction } from "./Instruction.js";

interface Constant {
  constantInstruction: ConstantInstruction<unknown>,
  scopeNode: NodeRef
}

export type ConstantRef = Brand<Constant, "ConstantRef">

interface Ref {
  superNode: NodeRef,
  scopeLevel: number
}

interface IfRef extends Ref {
  instruction: IfInstruction
}

interface IfElseRef extends Ref {
  instruction: IfElseInstruction
}

export type NodeRef = RootNodeRef | ThenNodeRef | ElseNodeRef

export type RootNodeRef = Brand<Ref, "RootNodeRef">
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
  superNode: NodeRef = this
  scopeLevel: number = 0
  __brand = "RootNodeRef" as const;
}

export function RootNodeRef(): RootNodeRef {
  return new RootNodeRefImpl()
}

export function ThenNodeRef(ifInstruction: IfInstruction, superNode: NodeRef, scopeLevel: number): ThenNodeRef {
  return {
    scopeLevel: scopeLevel,
    superNode: superNode,
    instruction: ifInstruction,
    __brand: "ThenNodeRef"
  }
}

export function ElseNodeRef(ifElseInstruction: IfElseInstruction, superNode: NodeRef, scopeLevel: number): ElseNodeRef {
  return {
    scopeLevel: scopeLevel,
    superNode: superNode,
    instruction: ifElseInstruction,
    __brand: "ElseNodeRef"
  }
}