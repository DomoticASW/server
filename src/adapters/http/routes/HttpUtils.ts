
import express from "express"
import { Effect, pipe } from "effect"
import { StatusCodes } from "http-status-codes"
import { Token } from "../../../domain/users-management/Token.js"
import { UnauthorizedError, InvalidTokenFormatError, InvalidTokenError } from "../../../ports/users-management/Errors.js"
import { Error } from "../../../ports/Error.js"
import { Brand } from "../../../utils/Brand.js"
import { UsersService } from "../../../ports/users-management/UserService.js"
import { PermissionError } from "../../../ports/permissions-management/Errors.js"

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
export function handleCommonErrors(eff: Effect.Effect<Response, BadRequest | UnauthorizedError | InvalidTokenFormatError | InvalidTokenError | PermissionError>): Effect.Effect<Response, void> {
    return pipe(
        eff,
        Effect.catchAll((err) => {
            switch (err.__brand) {
                case "InvalidTokenError":
                case "InvalidTokenFormatError":
                case "PermissionError":
                case "UnauthorizedError":
                    return Effect.succeed(Response(StatusCodes.UNAUTHORIZED, err))
                case "BadRequest":
                    return Effect.succeed(Response(StatusCodes.BAD_REQUEST, err))
            }
        })
    )
}
