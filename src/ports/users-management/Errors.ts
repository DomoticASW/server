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

export function DuplicateIdError(cause?: string): DuplicateIdError {
    return { message: "Id already in use", cause: cause, __brand: "DuplicateIdError" }
}

export function NotFoundError(cause?: string): NotFoundError {
    return { message: "Not found", cause: cause, __brand: "NotFoundError" }
}

export function EmailAlreadyInUseError(cause?: string): EmailAlreadyInUseError {
    return { message: "Email already in use", cause: cause, __brand: "EmailAlreadyInUseError" }
}

export function UserNotFoundError(cause?: string): UserNotFoundError {
    return { message: "User not found", cause: cause, __brand: "UserNotFoundError" }
}

export function InvalidTokenError(cause?: string): InvalidTokenError {
    return { message: "Invalid token", cause: cause, __brand: "InvalidTokenError" }
}

export function UnauthorizedError(cause?: string): UnauthorizedError {
    return { message: "Unauthorized", cause: cause, __brand: "UnauthorizedError" }
}

export function InvalidCredentialsError(cause?: string): InvalidCredentialsError {
    return { message: "Invalid credentials", cause: cause, __brand: "InvalidCredentialsError" }
}

export function InvalidTokenFormatError(cause?: string): InvalidTokenFormatError {
    return { message: "Invalid token format", cause: cause, __brand: "InvalidTokenFormatError" }
}

export function invalidTokenFormatError(cause?: string): invalidTokenFormatError {
    return { message: "Invalid token format", cause: cause, __brand: "invalidTokenFormatError" }
}

