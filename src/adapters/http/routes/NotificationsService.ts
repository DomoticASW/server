import express from "express";
import { NotificationsService } from "../../../ports/notifications-management/NotificationsService.js";
import { UsersService } from "../../../ports/users-management/UsersService.js";
import { Effect } from "effect";
import { BadRequest, deserializeToken, sendResponse, Response, handleCommonErrors } from "./HttpUtils.js";
import { DeviceId } from "../../../domain/devices-management/Device.js";
import { StatusCodes } from "http-status-codes";

export function registerNotificationsServiceRoutes(app: express.Express, service: NotificationsService, usersService: UsersService) {

  // create
  app.post('/api/notifications', async (req, res) => {
    const key = "deviceId"
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("deviceId", () => {
        if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
        else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
      Effect.bind("_", ({ token, deviceId }) => service.subscribeForDeviceOfflineNotifications(token, DeviceId(deviceId))),
      Effect.map(() => Response(StatusCodes.CREATED)),
      Effect.catch("__brand", {
        failure: "DeviceNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "UserNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )

    sendResponse(res, response)
  })

  // delete
  app.delete('/api/notifications/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("_", ({ token }) => service.unsubscribeForDeviceOfflineNotifications(token, DeviceId(req.params.id))),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "DeviceNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "UserNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )

    sendResponse(res, response)
  })

  // get
  app.get('/api/notifications/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("result", ({ token }) => service.isSubscribedForDeviceOfflineNotifications(token, DeviceId(req.params.id))),
      Effect.map(({ result }) => Response(StatusCodes.OK, result)),
      Effect.catch("__brand", {
        failure: "DeviceNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "UserNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )

    sendResponse(res, response)
  })
}