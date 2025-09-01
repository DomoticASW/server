import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type PermissionError = Brand<Error, "PermissionError">
export type InvalidOperationError = Brand<Error, "InvalidOperationError">
export type EditListNotFoundError = Brand<Error, "EditListNotFoundError">
export type UserDevicePermissionNotFoundError = Brand<Error, "UserDevicePermissionNotFoundError">
export type TaskListsNotFoundError = Brand<Error, "TaskListsNotFoundError">
export function PermissionError(cause?: string): PermissionError {
  return { message: "User doesn't have permissions", cause: cause, __brand: "PermissionError" }
}

export function InvalidOperationError(cause?: string): InvalidOperationError {
  return {
    message: "This operation cannot be executed",
    cause: cause,
    __brand: "InvalidOperationError",
  }
}

export function EditListNotFoundError(cause?: string): EditListNotFoundError {
  return { message: "The editlist didn't exist", cause: cause, __brand: "EditListNotFoundError" }
}

export function UserDevicePermissionNotFoundError(
  cause?: string
): UserDevicePermissionNotFoundError {
  return {
    message: "This user-device permission rule was not found",
    cause: cause,
    __brand: "UserDevicePermissionNotFoundError",
  }
}

export function TaskListsNotFoundError(cause?: string): TaskListsNotFoundError {
  return {
    message: "Task lists (editlist, whitelist and blacklist) was not found",
    cause: cause,
    __brand: "TaskListsNotFoundError",
  }
}
