
import express from "express"
import { Effect, pipe } from "effect"
import { StatusCodes } from "http-status-codes"
import { Token } from "../../../domain/users-management/Token.js"
import { UnauthorizedError, InvalidTokenFormatError, InvalidTokenError } from "../../../ports/users-management/Errors.js"
import { Error } from "../../../ports/Error.js"
import { Brand } from "../../../utils/Brand.js"
import { UsersService } from "../../../ports/users-management/UserService.js"
import { Type } from "../../../ports/devices-management/Types.js"
import { Color } from "../../../domain/devices-management/Types.js"

export interface Response {
    code: StatusCodes
    body?: unknown
}
export function Response(code: StatusCodes, body?: unknown): Response { return { code: code, body: body } }

export type BadRequest = Brand<Error, "BadRequest">
export function BadRequest(cause?: string): BadRequest {
    return { __brand: "BadRequest", message: "Bad request", cause: cause }
}

/** Sends the given response */
export function sendResponse(res: express.Response, response: Response): void {
    res.status(response.code).send(response.body)
}

/** Extracts and deserializes the auth Token from a request */
export function deserializeToken(req: express.Request, usersService: UsersService): Effect.Effect<Token, UnauthorizedError | InvalidTokenFormatError> {
    const tokenHeader = req.headers.authorization
    if (!tokenHeader) {
        return Effect.fail(UnauthorizedError("Missing auth token"))
    } else {
        return usersService.makeToken(tokenHeader)
    }
}

/** Maps common errors into responses with appropriate status code and body. */
export function handleCommonErrors(eff: Effect.Effect<Response, BadRequest | UnauthorizedError | InvalidTokenFormatError | InvalidTokenError>): Effect.Effect<Response, void> {
    return pipe(
        eff,
        Effect.catchAll((err) => {
            switch (err.__brand) {
                case "InvalidTokenError":
                case "InvalidTokenFormatError":
                case "UnauthorizedError":
                    return Effect.succeed(Response(StatusCodes.UNAUTHORIZED, err))
                case "BadRequest":
                    return Effect.succeed(Response(StatusCodes.BAD_REQUEST, err))
            }
        })
    )
}

/** An input value should have a value and it's associated type in order to decode it correctly */
export interface InputValue { value: boolean | number | string | Color | void; type: Type; }

const acceptedTypes = [Type.BooleanType, Type.ColorType, Type.IntType, Type.DoubleType, Type.StringType, Type.VoidType]

/** checks that the encoded object is a valid InputValue */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isInputValue(o: any): o is InputValue {
    if (!("value" in o && "type" in o && acceptedTypes.includes(o.type))) {
        return false
    } else {
        switch (o.type as Type) {
            case Type.DoubleType:
                return typeof o.value == "number"
            case Type.IntType:
                return Number.isInteger(o.value)
            case Type.BooleanType:
                return typeof o.value == "boolean"
            case Type.StringType:
                return typeof o.value == "string"
            case Type.ColorType:
                return "r" in o && "g" in o && "b" in o
            case Type.VoidType:
                return true
        }
    }
}
