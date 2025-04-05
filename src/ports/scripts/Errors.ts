import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type ScriptNotFoundError = Brand<Error, "ScriptNotFoundError">
export type InvalidScriptError = Brand<Error, "InvalidScriptError">
