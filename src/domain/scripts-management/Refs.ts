import { Type } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";

interface Constant{
  name: string,
  type: Type
}

export type ConstantRef = Brand<Constant, "ConstantRef">

export type NodeRef = RootNodeRef | ThenNodeRef | ElseNodeRef
export type RootNodeRef = Brand<unknown, "RootNodeRef">
export type ThenNodeRef = Brand<unknown, "ThenNodeRef">
export type ElseNodeRef = Brand<unknown, "ElseNodeRef">


export function ConstantRef(name: string, type: Type): ConstantRef {
  return {
    name: name,
    type: type,
    __brand: "ConstantRef"
  }
}

export function RootNodeRef(): RootNodeRef {
  return {
    __brand: "RootNodeRef"
  }
}

export function ThenNodeRef(): ThenNodeRef {
  return {
    __brand: "ThenNodeRef"
  }
}

export function ElseNodeRef(): ElseNodeRef {
  return {
    __brand: "ElseNodeRef"
  }
}