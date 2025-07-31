import express from "express";
import { Server as SocketIOServer } from "socket.io"
import { DevicesService } from "../../../../ports/devices-management/DevicesService.js";
import { UsersService } from "../../../../ports/users-management/UsersService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { deserializeToken, BadRequest, handleCommonErrors, sendResponse, Response } from "../HttpUtils.js";
import { DeviceActionsService } from "../../../../ports/devices-management/DeviceActionsService.js";
import { DeviceDTO, isDeviceAddress, isUpdateDevicePropertiesBody } from "./DTOs.js";
import { DeviceId, DevicePropertyId, DeviceActionId } from "../../../../domain/devices-management/Device.js";
import { startSocketIOPropertyUpdatesSubscriber } from "../../../devices-management/SocketIOPropertyUpdatesSubscriberAdapter.js";

export function registerDevicesServiceRoutes(app: express.Express, server: SocketIOServer, service: DevicesService, actionsService: DeviceActionsService, usersService: UsersService) {

    // create
    app.post('/api/devices', async (req, res) => {
        const key = "deviceAddress"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("deviceAddress", () => {
                if (req.body && key in req.body && isDeviceAddress(req.body[key])) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: {host: ..., port: ...}}`)) }
            }),
            Effect.bind("deviceId", ({ token, deviceAddress }) => service.add(token, deviceAddress)),
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
        const key = "name"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("nameVal", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("name", ({ nameVal }) => {
                if (typeof nameVal == "string") { return Effect.succeed(nameVal) }
                else { return Effect.fail(BadRequest(`Expected ${key} of type string but found ${typeof nameVal}`)) }
            }),
            Effect.bind("_", ({ name, token }) => service.rename(token, DeviceId(req.params.id), name)),
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
            Effect.map(({ device }) => Response(StatusCodes.OK, DeviceDTO(device))),
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
            Effect.map(({ devices }) => Response(StatusCodes.OK, Array.from(devices).map(d => DeviceDTO(d)))),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });

    // update property
    app.patch('/api/devices/:id/properties/:propertyId', async (req, res) => {
        const key = "value"
        const response = await Effect.Do.pipe(
            Effect.bind("value", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("_", ({ value }) => service.updateDeviceProperty(DeviceId(req.params.id), DevicePropertyId(req.params.propertyId), value)),
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

    // update properties
    app.patch('/api/devices/:id/properties', async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("updates", () => {
                if (isUpdateDevicePropertiesBody(req.body)) {
                    return Effect.succeed(req.body)
                } else {
                    return Effect.fail(BadRequest(`Expected body format is: [{propertyId: ..., value: ...}, ...]`))
                }
            }),
            Effect.bind("_", ({ updates }) => {
                const updatesMap = new Map(updates.map(item => [DevicePropertyId(item.propertyId), item.value]))
                return service.updateDeviceProperties(DeviceId(req.params.id), updatesMap)
            }),
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
        const key = "input"
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("input", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.succeed(undefined) }
            }),
            Effect.bind("_", ({ token, input }) => actionsService.executeAction(token, DeviceId(req.params.id), DeviceActionId(req.params.actionId), input)),
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

    app.get("/api/discovered-devices", async (req, res) => {
        const response = await Effect.Do.pipe(
            Effect.bind("token", () => deserializeToken(req, usersService)),
            Effect.bind("devices", ({ token }) => service.discoveredDevices(token)),
            Effect.map(({ devices }) => Response(StatusCodes.OK, Array.from(devices))),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    })

    startSocketIOPropertyUpdatesSubscriber(server.of("/api/devices/property-updates"), service)
}
