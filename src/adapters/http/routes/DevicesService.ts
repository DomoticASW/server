import express from "express";
import { DevicesService } from "../../../ports/devices-management/DevicesService.js";
import { UsersService } from "../../../ports/users-management/UsersService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { deserializeToken, BadRequest, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus, DeviceAddress } from "../../../domain/devices-management/Device.js";
import { Type } from "../../../ports/devices-management/Types.js";
import { TypeConstraints } from "../../../domain/devices-management/Types.js";

export function registerDevicesServiceRoutes(app: express.Express, service: DevicesService, usersService: UsersService) {

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
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("_", ({ token, input }) => service.executeAction(token, DeviceId(req.params.id), DeviceActionId(req.params.actionId), input)),
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

// Below are utils to serialize and deserialize stuff

interface DeviceDTO {
    id: string
    name: string
    address: DeviceAddressDTO
    status: DeviceStatus
    properties: DevicePropertyDTO[]
    actions: DeviceActionDTO[]
    events: DeviceEventDTO[]
}
function DeviceDTO(d: Device): DeviceDTO {
    return {
        id: d.id,
        name: d.name,
        address: DeviceAddressDTO(d.address),
        status: d.status,
        properties: d.properties.map(p => DevicePropertyDTO(p)),
        actions: d.actions.map(a => DeviceActionDTO(a)),
        events: d.events.map(e => DeviceEventDTO(e)),
    }
}

interface DeviceAddressDTO {
    host: string
    port: number
}
function DeviceAddressDTO(a: DeviceAddress): DeviceAddressDTO {
    return { host: a.host, port: a.port }
}

interface DeviceEventDTO {
    name: string
}
function DeviceEventDTO(e: DeviceEvent): DeviceEventDTO {
    return { name: e.name }
}

interface DeviceActionDTO {
    id: string;
    name: string;
    description?: string;
    inputTypeConstraints: TypeConstraintsDTO;
}
function DeviceActionDTO(a: DeviceAction<unknown>): DeviceActionDTO {
    const itc = TypeConstraintsDTO(a.inputTypeConstraints)
    return { id: a.id, name: a.name, description: a.description, inputTypeConstraints: itc }
}

interface DevicePropertyDTO {
    id: string
    name: string
    value: unknown
    setter?: DeviceActionDTO
    typeConstraints: TypeConstraintsDTO
}
function DevicePropertyDTO(p: DeviceProperty<unknown>): DevicePropertyDTO {
    const tc = TypeConstraintsDTO(p.typeConstraints)
    const setter = p.setter ? DeviceActionDTO(p.setter) : undefined
    return { id: p.id, name: p.name, value: p.value, setter: setter, typeConstraints: tc }
}

type TypeConstraintsDTO = EnumTypeConstraintDTO | IntRangeTypeConstraintDTO | DoubleRangeTypeConstraintDTO | NoneTypeConstraintDTO
function TypeConstraintsDTO(tc: TypeConstraints<unknown>): TypeConstraintsDTO {
    switch (tc.__brand) {
        case "Enum":
            return { __brand: "Enum", type: tc.type, values: Array.from(tc.values) } as EnumTypeConstraintDTO
        case "IntRange":
        case "DoubleRange":
            return { __brand: tc.__brand, type: tc.type, min: tc.min, max: tc.max } as IntRangeTypeConstraintDTO | DoubleRangeTypeConstraintDTO
        case "None":
            return { __brand: "None", type: tc.type } as NoneTypeConstraintDTO
    }
}

interface TypeConstraintDTO {
    type: Type;
}

interface EnumTypeConstraintDTO extends TypeConstraintDTO {
    __brand: "Enum"
    values: string[]
}
interface IntRangeTypeConstraintDTO extends TypeConstraintDTO {
    __brand: "IntRange"
    min: number
    max: number
}
interface DoubleRangeTypeConstraintDTO extends TypeConstraintDTO {
    __brand: "DoubleRange"
    min: number
    max: number
}
interface NoneTypeConstraintDTO extends TypeConstraintDTO {
    __brand: "None"
}

function isDeviceAddress(a: unknown): a is DeviceAddress {
    return a != null && typeof a == "object" &&
        "host" in a && typeof a.host == "string" &&
        "port" in a && Number.isInteger(a.port)
}

type UpdateDevicePropertiesBody = Array<UpdateDevicePropertyItem>
interface UpdateDevicePropertyItem {
    propertyId: string
    value: unknown
}
function isUpdateDevicePropertiesBody(o: unknown): o is UpdateDevicePropertiesBody {
    return o != undefined && Array.isArray(o) &&
        (o.length == 0 || o.map(e => isUpdateDevicePropertyItem(e)).reduce((a, b) => a && b))

}
function isUpdateDevicePropertyItem(o: unknown): o is UpdateDevicePropertyItem {
    return o != undefined && typeof o == "object" &&
        "propertyId" in o && typeof o.propertyId == "string" &&
        "value" in o
}
