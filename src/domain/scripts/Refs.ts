import { Brand } from "../../utils/Brand.js";

export type ConstantRef<T> = Brand<T, "ConstantRef">

export type NodeRef = RootNodeRef | ThenNodeRef | ElseNodeRef
export type RootNodeRef = Brand<string, "RootNodeRef">
export type ThenNodeRef = Brand<string, "ThenNodeRef">
export type ElseNodeRef = Brand<string, "ElseNodeRef">