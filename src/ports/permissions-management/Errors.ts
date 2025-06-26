import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type PermissionError = Brand<Error, "PermissionError">
export type InvalidOperationError = Brand<Error, "InvalidOperationError">
export function PermissionError(cause?: string): PermissionError {
  return { message: "User doesn't have permissions", cause: cause, __brand: "PermissionError" }
}

export function InvalidOperationError(cause?: string): InvalidOperationError {
  return { message: "This operation cannot be executed", cause: cause, __brand: "InvalidOperationError" }
}