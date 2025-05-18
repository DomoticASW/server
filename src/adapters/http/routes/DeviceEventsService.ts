import express from "express";
import { DeviceEventsService } from "../../../ports/devices-management/DeviceEventsService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { DeviceId } from "../../../domain/devices-management/Device.js";
import { BadRequest, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";


export function registerDeviceEventsServiceRoutes(app: express.Express, service: DeviceEventsService) {

    // publish event
    app.post('/api/devices/:id/events', async (req, res) => {
        const key = "event"
        const response = await Effect.Do.pipe(
            Effect.bind("event", () => {
                if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
                else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
            }),
            Effect.bind("_", ({ event }) => service.publishEvent(DeviceId(req.params.id), event)),
            Effect.map(() => Response(StatusCodes.OK)),
            Effect.catch("__brand", {
                failure: "DeviceNotFoundError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
            }),
            Effect.catch("__brand", {
                failure: "NotDeviceEventError",
                onFailure: (err) => Effect.succeed(Response(StatusCodes.BAD_REQUEST, err))
            }),
            handleCommonErrors,
            Effect.runPromise
        )
        sendResponse(res, response)
    });
}
