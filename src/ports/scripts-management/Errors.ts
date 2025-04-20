import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type ScriptNotFoundError = Brand<Error, "ScriptNotFoundError">
export type InvalidScriptError = Brand<Error, "InvalidScriptError">
export type TaskNameAlreadyInUse = Brand<Error, "TaskNameAlreadyInUse">
export type InvalidTaskError = Brand<Error, "InvalidTaskError">
export type AutomationNameAlreadyInUse = Brand<Error, "AutomationNameAlreadyInUse">
export type InvalidAutomationError = Brand<Error, "InvalidAutomationError">
export type ScriptError = Brand<Error, "ScriptError">