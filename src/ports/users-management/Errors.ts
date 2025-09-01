import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type InvalidCredentialsError = Brand<Error, "InvalidCredentialsError">
export type InvalidTokenFormatError = Brand<Error, "InvalidTokenFormatError">
export type EmailAlreadyInUseError = Brand<Error, "EmailAlreadyInUseError">
export type UserNotFoundError = Brand<Error, "UserNotFoundError">
export type RegistrationRequestNotFoundError = Brand<Error, "RegistrationRequestNotFoundError">
export type TokenError = InvalidTokenError | UnauthorizedError
export type InvalidTokenError = Brand<Error, "InvalidTokenError">
export type UnauthorizedError = Brand<Error, "UnauthorizedError">

export function EmailAlreadyInUseError(cause?: string): EmailAlreadyInUseError {
  return { message: "This email is already used", cause: cause, __brand: "EmailAlreadyInUseError" }
}

export function UserNotFoundError(cause?: string): UserNotFoundError {
  return { message: "This user was not found", cause: cause, __brand: "UserNotFoundError" }
}

export function RegistrationRequestNotFoundError(cause?: string): RegistrationRequestNotFoundError {
  return {
    message: "This registration request was not found",
    cause: cause,
    __brand: "RegistrationRequestNotFoundError",
  }
}

export function InvalidTokenError(cause?: string): InvalidTokenError {
  return {
    message: "The provided authentication token is not valid",
    cause: cause,
    __brand: "InvalidTokenError",
  }
}

export function InvalidCredentialsError(cause?: string): InvalidCredentialsError {
  return {
    message: "The provided credentials are not valid",
    cause: cause,
    __brand: "InvalidCredentialsError",
  }
}

export function InvalidTokenFormatError(cause?: string): InvalidTokenFormatError {
  return {
    message: "The provided authentication token format is not valid",
    cause: cause,
    __brand: "InvalidTokenFormatError",
  }
}

export function UnauthorizedError(cause?: string): UnauthorizedError {
  return {
    message: "You are not authorized to perform this operation",
    cause: cause,
    __brand: "UnauthorizedError",
  }
}
