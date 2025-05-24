import express from "express";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { UsersService } from "../../../ports/users-management/UserService.js";
import { deserializeToken, BadRequest, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { Email, Nickname, PasswordHash } from "../../../domain/users-management/User.js";

export function registerUsersServiceRoutes(app: express.Application, service: UsersService) {

    // create registration request
    app.post('api/users', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("nicknameVal", () => {
                if (req.body && "nickname" in req.body) { return Effect.succeed(req.body["nickname"]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {nickname: ???}`)) }
            }
            ),
            Effect.bind("nicknameString", ({ nicknameVal }) => {
                if (typeof nicknameVal == "string") { return Effect.succeed(nicknameVal) }
                else { return Effect.fail(BadRequest(`Expected nickname of type string but found ${typeof nicknameVal}`)) }
            }),
            Effect.bind("emailVal", () => {
                if (req.body && "email" in req.body) { return Effect.succeed(req.body["email"]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {email: ???}`)) }
            }),
            Effect.bind("emailString", ({ emailVal }) => {
                if (typeof emailVal == "string") { return Effect.succeed(emailVal) }
                else { return Effect.fail(BadRequest(`Expected email of type string but found ${typeof emailVal}`)) }
            }),
            Effect.bind("passwordVal", () => {
                if (req.body && "password" in req.body) { return Effect.succeed(req.body["password"]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {password: ???}`)) }
            }),
            Effect.bind("passwordString", ({ passwordVal }) => {
                if (typeof passwordVal == "string") { return Effect.succeed(passwordVal) }
                else { return Effect.fail(BadRequest(`Expected password of type string but found ${typeof passwordVal}`)) }
            }),
            Effect.bind("nickname", ({ nicknameString }) => Effect.succeed(Nickname(nicknameString))),
            Effect.bind("email", ({ emailString }) => Effect.succeed(Email(emailString))),
            Effect.bind("password", ({ passwordString }) => Effect.succeed(PasswordHash(passwordString))),
            Effect.bind("_", ({ nickname, email, password }) => service.publishRegistrationRequest(nickname, email, password)),
            Effect.map(() => Response(StatusCodes.CREATED)),
            Effect.catch("__brand", {
                failure: "EmailAlreadyInUseError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.CONFLICT, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // approve registration request
    app.post('api/users/approve', async (req, res) => {
        const key = "email"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, service)),
            Effect.bind("emailVal", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("emailString", ({ emailVal }) => {
                if (typeof emailVal == "string") { return Effect.succeed(emailVal) }
                else { return Effect.fail(BadRequest(`Expected ${key} of type string but found ${typeof emailVal}`)) }
            }),
            Effect.bind("email", ({ emailString }) => Effect.succeed(Email(emailString))),
            Effect.bind("_", ({ token, email }) => service.approveRegistrationRequest(token, email)),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "UserNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // reject registration request
    app.post('api/users/reject', async (req, res) => {
        const key = "email"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, service)),
            Effect.bind("emailVal", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("emailString", ({ emailVal }) => {
                if (typeof emailVal == "string") { return Effect.succeed(emailVal) }
                else { return Effect.fail(BadRequest(`Expected ${key} of type string but found ${typeof emailVal}`)) }
            }),
            Effect.bind("email", ({ emailString }) => Effect.succeed(Email(emailString))),
            Effect.bind("_", ({ token, email }) => service.rejectRegistrationRequest(token, email)),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "UserNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // delete
    app.delete('api/users/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, service)),
            Effect.bind("_", ({ token }) => service.removeUser(token, Email(req.params.id))),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "UserNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // update
    app.patch('api/users/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, service)),
            Effect.bind("nicknameVal", () => {
                if (req.body && "nickname" in req.body) { return Effect.succeed(req.body["nickname"]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {nickname: ???}`)) }
            }),
            Effect.bind("nicknameString", ({ nicknameVal }) => {
                if (typeof nicknameVal == "string") { return Effect.succeed(nicknameVal) }
                else { return Effect.fail(BadRequest(`Expected nickname of type string but found ${typeof nicknameVal}`)) }
            }),
            Effect.bind("passwordVal", () => {
                if (req.body && "password" in req.body) { return Effect.succeed(req.body["password"]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {password: ???}`)) }
            }),
            Effect.bind("passwordString", ({ passwordVal }) => {
                if (typeof passwordVal == "string") { return Effect.succeed(passwordVal) }
                else { return Effect.fail(BadRequest(`Expected password of type string but found ${typeof passwordVal}`)) }
            }),
            Effect.bind("nickname", ({ nicknameString }) => Effect.succeed(Nickname(nicknameString))),
            Effect.bind("password", ({ passwordString }) => Effect.succeed(PasswordHash(passwordString))),
            Effect.bind("_", ({ token, nickname, password }) => service.updateUserData(token, nickname, password)),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "UserNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),            
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // get all
    app.get('/api/users', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, service)),
            Effect.bind("users", ({ token }) => service.getAllUsers(token)),
            Effect.map(({ users }) => Response(StatusCodes.CREATED, Array.from(users))),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // get one with token
    app.get('/api/users/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, service)),
            Effect.bind("user", ({ token }) => service.getUserData(token)),
            Effect.map(({ user }) => Response(StatusCodes.OK, user)),
            
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // login
    app.post('/api/users/login', async (req, res) => {
        const key = "password"
        const response = await Effect.Do.pipe(
            Effect.bind("emailVal", () => {
                if (req.body && "email" in req.body) { return Effect.succeed(req.body["email"]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {email: ???}`)) }
            }),
            Effect.bind("emailString", ({ emailVal }) => {
                if (typeof emailVal == "string") { return Effect.succeed(emailVal) }
                else { return Effect.fail(BadRequest(`Expected email of type string but found ${typeof emailVal}`)) }
            }),
            Effect.bind("passwordVal", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("passwordString", ({ passwordVal }) => {
                if (typeof passwordVal == "string") { return Effect.succeed(passwordVal) }
                else { return Effect.fail(BadRequest(`Expected ${key} of type string but found ${typeof passwordVal}`)) }
            }),
            Effect.bind("token", ({ emailString, passwordString }) => service.login(Email(emailString), PasswordHash(passwordString))),
            Effect.map(({ token }) => Response(StatusCodes.OK, token)),
            Effect.catch("__brand", {
                failure: "InvalidCredentialsError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.UNAUTHORIZED, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });
}
