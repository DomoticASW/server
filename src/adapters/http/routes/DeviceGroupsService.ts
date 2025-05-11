import express from "express";
import { Effect } from "effect";
import { DeviceGroupId } from "../../../domain/devices-management/DeviceGroup.js";
import { DeviceGroupsService } from "../../../ports/devices-management/DeviceGroupsService.js";
import { UsersService } from "../../../ports/users-management/UserService.js";
import { StatusCodes } from "http-status-codes";
import { BadRequest, deserializeToken, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { DeviceId } from "../../../domain/devices-management/Device.js";

export function registerDeviceGroupsServiceRoutes(app: express.Express, service: DeviceGroupsService, usersService: UsersService) {

    // create
    app.post('/api/deviceGroups', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", () => Effect.if(req.body != undefined && "name" in req.body, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(BadRequest("Missing name property in request body"))
            })),
            Effect.bind("deviceGroupId", ({ token }) => service.addGroup(token, req.body.name)),
            Effect.map(({ deviceGroupId }) => Response(StatusCodes.CREATED, { id: deviceGroupId })),
            Effect.catch("__brand", {
                failure: "DeviceGroupNameAlreadyInUseError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.CONFLICT, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // get one
    app.get('/api/deviceGroups/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("deviceGroup", ({ token }) => service.findGroup(token, DeviceGroupId(req.params.id))),
            Effect.map(({ deviceGroup }) => Response(StatusCodes.OK, deviceGroup)),
            Effect.catch("__brand", {
                failure: "DeviceGroupNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // rename
    app.post('/api/deviceGroups/:id', async (req, res) => {
        const bodyProperty = "name"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", () => Effect.if(req.body != undefined && bodyProperty in req.body, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(BadRequest(`Missing ${bodyProperty} property in request body`))
            })),
            Effect.bind("__", ({ token }) => service.renameGroup(token, DeviceGroupId(req.params.id), req.body[bodyProperty])),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceGroupNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "DeviceGroupNameAlreadyInUseError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.CONFLICT, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // delete
    app.delete('/api/deviceGroups/:id', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", ({ token }) => service.removeGroup(token, DeviceGroupId(req.params.id))),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceGroupNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // get all
    app.get('/api/deviceGroups', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("deviceGroups", ({ token }) => service.getAllDeviceGroups(token)),
            Effect.map(({ deviceGroups }) => Response(StatusCodes.CREATED, Array.from(deviceGroups))),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // add device
    app.post('/api/deviceGroups/:id/device', async (req, res) => {
        const bodyProperty = "deviceId"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("_", () => Effect.if(req.body != undefined && bodyProperty in req.body, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(BadRequest(`Missing ${bodyProperty} property in request body`))
            })),
            Effect.bind("__", ({ token }) => service.addDeviceToGroup(token, DeviceId(req.body[bodyProperty]), DeviceGroupId(req.params.id))),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceGroupNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // remove device
    app.delete('/api/deviceGroups/:id/device/:deviceId', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("__", ({ token }) => service.removeDeviceFromGroup(token, DeviceId(req.params.deviceId), DeviceGroupId(req.params.id))),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceGroupNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });
}
