import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type InvalidCredentialsError = Brand<Error, "InvalidCredentialsError">
export type InvalidTokenFormatError = Brand<Error, "InvalidTokenFormatError">
export type invalidTokenFormatError = Brand<Error, "invalidTokenFormatError">
export type EmailAlreadyInUseError = Brand<Error, "EmailAlreadyInUseError">
export type DuplicateIdError = Brand<Error, "DuplicateIdError">
export type NotFoundError = Brand<Error, "NotFoundError">
export type UserNotFoundError = Brand<Error, "UserNotFoundError">
export type TokenError = InvalidTokenError | UnauthorizedError
export type InvalidTokenError = Brand<Error, "InvalidTokenError">
export type UnauthorizedError = Brand<Error, "UnauthorizedError">
export function UnauthorizedError(cause?: string): UnauthorizedError {
    return { message: "You are not authorized to perform this operation", cause: cause, __brand: "UnauthorizedError" }
}
