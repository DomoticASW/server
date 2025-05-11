import express from "express";
import { DevicesService } from "../../../ports/devices-management/DevicesService.js";
import { UsersService } from "../../../ports/users-management/UserService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { deserializeToken, BadRequest, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { DeviceId } from "../../../domain/devices-management/Device.js";

export function registerDevicesServiceRoutes(app: express.Express, service: DevicesService, usersService: UsersService) {

    // create
    app.post('/api/devices', async (req, res) => {
        const bodyProperty = "deviceUrl"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", () => Effect.if(req.body != undefined && bodyProperty in req.body, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(BadRequest(`Missing ${bodyProperty} property in request body`))
            })),
            Effect.bind("url", () =>
                Effect.try({
                    try: () => new URL(req.body[bodyProperty]),
                    catch: () => BadRequest(`"${req.body[bodyProperty]}" is not a valid URL`)
                })
            ),
            Effect.bind("deviceId", ({ token, url }) => service.add(token, url)),
            Effect.map(({ deviceId }) => Response(StatusCodes.CREATED, { id: deviceId })),
            Effect.catch("__brand", {
                failure: "DeviceAlreadyRegisteredError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.CONFLICT, err))
            }),
            Effect.catch("__brand", {
                failure: "DeviceUnreachableError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // delete
    app.delete('/api/devices/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", ({ token }) => service.remove(token, DeviceId(req.params.id))),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // rename
    app.post('/api/devices/:id', async (req, res) => {
        const bodyProperty = "name"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", () => Effect.if(req.body != undefined && bodyProperty in req.body, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(BadRequest(`Missing ${bodyProperty} property in request body`))
            })),
            Effect.bind("__", ({ token }) => service.rename(token, DeviceId(req.params.id), req.body[bodyProperty])),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // get one
    app.get('/api/devices/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("device", ({ token }) => service.find(token, DeviceId(req.params.id))),
            Effect.map(({ device }) => Response(StatusCodes.OK, device)),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // get all
    app.get('/api/devices', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("devices", ({ token }) => service.getAllDevices(token)),
            Effect.map(({ devices }) => Response(StatusCodes.CREATED, Array.from(devices))),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });
}
