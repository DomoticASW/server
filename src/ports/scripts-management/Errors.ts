import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type ScriptNotFoundError = Brand<Error, "ScriptNotFoundError">
export type InvalidScriptError = Brand<Error, "InvalidScriptError">
export type TaskNameAlreadyInUseError = Brand<Error, "TaskNameAlreadyInUse">
export type AutomationNameAlreadyInUseError = Brand<Error, "AutomationNameAlreadyInUse">
export type ScriptError = Brand<Error, "ScriptError">
export type InvalidConstantTypeError = Brand<Error, "InvalidConstantType">

export function ScriptError(cause?: string): ScriptError {
  return { message: "There was an error in the script execution", cause: cause, __brand: "ScriptError" }
}

export function ScriptNotFoundError(cause?: string): ScriptNotFoundError {
  return { message: "The script has not been found", cause: cause, __brand: "ScriptNotFoundError" }
}

export function InvalidConstantTypeError(cause?: string): InvalidConstantTypeError {
  return { message: "The constant type is not valid", cause: cause, __brand: "InvalidConstantType" }
}

export function InvalidScriptError(cause?: string): InvalidScriptError {
  return { message: "There is an error in the script syntax", cause: cause, __brand: "InvalidScriptError" }
}

export function TaskNameAlreadyInUseError(cause?: string): TaskNameAlreadyInUseError {
  return { message: "A task with this name already exists", cause: cause, __brand: "TaskNameAlreadyInUse" }
}

export function AutomationNameAlreadyInUseError(cause?: string): AutomationNameAlreadyInUseError {
  return { message: "An automation with this name already exists", cause: cause, __brand: "AutomationNameAlreadyInUse" }
}
