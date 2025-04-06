import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type InvalidCredentialsError = Brand<Error, "InvalidCredentialsError">
export type InvalidTokenFormatError = Brand<Error, "InvalidTokenFormatError">
export type invalidTokenFormatError = Brand<Error, "invalidTokenFormatError">
export type EmailAlreadyInUseError = Brand<Error, "EmailAlreadyInUseError">
export type DuplicateIdError = Brand<Error, "DuplicateIdError">
export type NotFoundError = Brand<Error, "NotFoundError">
export type UserNotFoundError = Brand<Error, "UserNotFoundError">
export type TokenError = Brand<Error, "TokenError">
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

export function userNotFoundError(cause?: string): UserNotFoundError {
    return { message: "User not found", cause: cause, __brand: "UserNotFoundError" }
}