import express from "express";
import { DevicesService } from "../../../ports/devices-management/DevicesService.js";
import { UsersService } from "../../../ports/users-management/UserService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { deserializeToken, BadRequest, handleCommonErrors, sendResponse, Response, isInputValue } from "./HttpUtils.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../domain/devices-management/Device.js";
import { Type } from "../../../ports/devices-management/Types.js";

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

    // update property
    app.patch('/api/devices/:id/properties/:propertyId', async (req, res) => {
        const response = await Effect.Do.pipe(
            // input validation
            Effect.bind("inputValue", () => {
                if (isInputValue(req.body) && req.body.type != Type.VoidType) {
                    return Effect.succeed(req.body)
                } else {
                    return Effect.fail(BadRequest(`Expected body format is: {value: ???, type: ???} where value is of type "type" and type can be one of ${[Type.BooleanType, Type.ColorType, Type.IntType, Type.DoubleType, Type.StringType]}`))
                }
            }),
            Effect.bind("_", ({ inputValue }) => service.updateDeviceProperty(DeviceId(req.params.id), DevicePropertyId(req.params.propertyId), inputValue.value)),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "DevicePropertyNotFound",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // execute action
    app.post('/api/devices/:id/actions/:actionId/execute', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            // input validation
            Effect.bind("inputValue", () => {
                if (isInputValue(req.body)) {
                    return Effect.succeed(req.body)
                } else {
                    return Effect.fail(BadRequest(`Expected body format is: {value: ???, type: ???} where value is of type "type" and type can be one of ${[Type.BooleanType, Type.ColorType, Type.IntType, Type.DoubleType, Type.StringType, Type.VoidType]}`))
                }
            }),
            Effect.bind("_", ({ token, inputValue }) => service.executeAction(token, DeviceId(req.params.id), DeviceActionId(req.params.actionId), inputValue.value)),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "DeviceActionNotFound",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "InvalidInputError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.BAD_REQUEST, err))
            }),
            Effect.catch("__brand", {
                failure: "DeviceActionError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.INTERNAL_SERVER_ERROR, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });
}
