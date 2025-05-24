import express from "express";
import { PermissionsService } from "../../../ports/permissions-management/PermissionsService.js";
import { UsersService } from "../../../ports/users-management/UsersService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { BadRequest, deserializeToken, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { TaskId } from "../../../domain/scripts-management/Script.js";
import { DeviceId } from "../../../domain/devices-management/Device.js";
import { Email } from "../../../domain/users-management/User.js";

export function registerDevicesServiceRoutes(app: express.Express, service: PermissionsService, usersService: UsersService) {
  
  // add to user device permission
  app.post('/api/permissions/user-device/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.addUserDevicePermission(token, Email(email), DeviceId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
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

  // remove from user device permission
  app.delete('/api/permissions/user-device/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.removeUserDevicePermission(token, Email(email), DeviceId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
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

  // can execute action on device
  app.get('/api/permissions/canExecute/device/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("_", ({ token }) => service.canExecuteActionOnDevice(token, DeviceId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // can execute task
  app.get('/api/permissions/canExecute/task/:id', async (req, res) => {
      const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("_", ({ token }) => service.canExecuteTask(token, TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
            failure: "TaskNotFoundError",
            onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
      )
      sendResponse(res, response)
  });

   // can edit
   app.get('/api/permissions/canEdit/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("_", ({ token }) => service.canEdit(token, TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // add to blacklist
  app.patch('/api/permissions/blacklist/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.addToBlacklist(token, Email(email) ,TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // add to whitelist
  app.patch('/api/permissions/whitelist/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.addToWhitelist(token, Email(email) ,TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // add to editlist
  app.patch('/api/permissions/editlist/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.addToEditlist(token, Email(email), TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // remove from blacklist
  app.delete('/api/permissions/blacklist/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.removeFromBlacklist(token, Email(email), TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // remove from whitelist
  app.delete('/api/permissions/whitelist/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.removeFromWhitelist(token, Email(email), TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });

  // remove from editlist
  app.delete('/api/permissions/editlist/:id', async (req, res) => {
    const key = "email"
    const response = await Effect.Do.pipe(
        Effect.bind("token", () => deserializeToken(req, usersService)),
        Effect.bind("email", () => {
          if (req.body && key in req.body) { return Effect.succeed(req.body[key]) }
          else { return Effect.fail(BadRequest(`Expected body format is: {${key}: ???}`)) }
      }),
        Effect.bind("_", ({ token, email }) => service.removeFromEditlist(token, Email(email), TaskId(req.params.id))),
        Effect.map(() => Response(StatusCodes.OK)),
        Effect.catch("__brand", {
          failure: "UserNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        Effect.catch("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
        }),
        handleCommonErrors,
        Effect.runPromise
    )
    sendResponse(res, response)
  });
}