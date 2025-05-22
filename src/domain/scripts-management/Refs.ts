import { Type } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";
import { Condition } from "./Instruction.js";

interface Constant{
  name: string,
  type: Type
}

export type ConstantRef = Brand<Constant, "ConstantRef">

interface Ref {
  scopeLevel: number,
  superNode: NodeRef
}

interface IfRef {
  condition: Condition<unknown>
}

export type NodeRef = RootNodeRef | ThenNodeRef | ElseNodeRef

export type RootNodeRef = Brand<Ref, "RootNodeRef">
export type ThenNodeRef = Brand<Ref & IfRef, "ThenNodeRef">
export type ElseNodeRef = Brand<Ref & IfRef, "ElseNodeRef">


export function ConstantRef(name: string, type: Type): ConstantRef {
  return {
    name: name,
    type: type,
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

export function ThenNodeRef(level: number, superNode: NodeRef, condition: Condition<unknown>): ThenNodeRef {
  return {
    scopeLevel: level,
    superNode: superNode,
    condition: condition,
    __brand: "ThenNodeRef"
  }
}

export function ElseNodeRef(level: number, superNode: NodeRef, condition: Condition<unknown>): ElseNodeRef {
  return {
    scopeLevel: level,
    superNode: superNode,
    condition: condition,
    __brand: "ElseNodeRef"
  }
}