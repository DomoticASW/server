import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type ScriptNotFoundError = Brand<Error, "ScriptNotFoundError">
export type InvalidScriptError = Brand<Error, "InvalidScriptError">
export type TaskNameAlreadyInUse = Brand<Error, "TaskNameAlreadyInUse">
export type InvalidTaskError = Brand<Error, "InvalidTaskError">
export type AutomationNameAlreadyInUse = Brand<Error, "AutomationNameAlreadyInUse">
export type InvalidAutomationError = Brand<Error, "InvalidAutomationError">
export type ScriptError = Brand<Error, "ScriptError">
export type InvalidConstantType = Brand<Error, "InvalidConstantType">

export function ScriptError(cause?: string): ScriptError {
  return { message: "There was an error in the script execution", cause: cause, __brand: "ScriptError" }
}

export function ScriptNotFoundError(cause?: string): ScriptNotFoundError {
  return { message: "The script has not been found", cause: cause, __brand: "ScriptNotFoundError" }
}

export function InvalidConstantType(cause?: string): InvalidConstantType {
  return { message: "The constant type is not valid", cause: cause, __brand: "InvalidConstantType" }
}

export function InvalidScriptError(cause?: string): InvalidScriptError {
  return { message: "There is an error in the script syntax", cause: cause, __brand: "InvalidScriptError" }
}
