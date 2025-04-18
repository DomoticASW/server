import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type PermissionError = Brand<Error, "PermissionError">
export type TaskNotFoundError = Brand<Error, "TaskNotFoundError">
export function PermissionError(cause?: string): PermissionError {
  return { message: "User doesn't have permissions", cause: cause, __brand: "PermissionError" }
}
export function TaskNotFoundError(cause?: string): TaskNotFoundError {
  return { message: "Task not found", cause: cause, __brand: "TaskNotFoundError" }
}