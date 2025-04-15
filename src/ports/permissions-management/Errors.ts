import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type PermissionError = Brand<Error, "PermissionError">
export function PermissionError(cause?: string): PermissionError {
  return { message: "User doesn't have permissions", cause: cause, __brand: "PermissionError" }
}