import { Type } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";

export interface Ref {
  name: string
}

interface Constant extends Ref {
  type: Type
}

export type ConstantRef = Brand<Constant, "ConstantRef">

export type NodeRef = RootNodeRef | ThenNodeRef | ElseNodeRef
export type RootNodeRef = Brand<Ref, "RootNodeRef">
export type ThenNodeRef = Brand<Ref, "ThenNodeRef">
export type ElseNodeRef = Brand<Ref, "ElseNodeRef">


export function ConstantRef(name: string, type: Type): ConstantRef {
  return {
    name: name,
    type: type,
    __brand: "ConstantRef"
  }
}

export function RootNodeRef(name: string): RootNodeRef {
  return {
    name: name,
    __brand: "RootNodeRef"
  }
}

export function ThenNodeRef(name: string): ThenNodeRef {
  return {
    name: name,
    __brand: "ThenNodeRef"
  }
}

export function ElseNodeRef(name: string): ElseNodeRef {
  return {
    name: name,
    __brand: "ElseNodeRef"
  }
}