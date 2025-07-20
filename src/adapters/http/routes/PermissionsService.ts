import express from "express";
import { PermissionsService } from "../../../ports/permissions-management/PermissionsService.js";
import { UsersService } from "../../../ports/users-management/UsersService.js";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";
import { BadRequest, deserializeToken, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { TaskId } from "../../../domain/scripts-management/Script.js";
import { DeviceId } from "../../../domain/devices-management/Device.js";
import { Email } from "../../../domain/users-management/User.js";

export function registerPermissionsServiceRoutes(app: express.Express, service: PermissionsService, usersService: UsersService) {

  // get one user device permission
  app.get('/api/permissions/user-device/:id', async (req, res) => {
    const response =  await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("userDevicePermission", ({ token }) => service.findUserDevicePermission(token, DeviceId(req.params.id))),
      Effect.map(({ userDevicePermission }) => Response(StatusCodes.OK, userDevicePermission)),
      Effect.catch("__brand", {
          failure: "UserDevicePermissionNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // get all user device permissions
  app.get('/api/permissions/user-device', async (req, res) => {
    const response =  await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("userDevicePermissions", ({ token }) => service.getAllUserDevicePermissions(token)),
      Effect.map(({ userDevicePermissions }) => Response(StatusCodes.OK, Array.from(userDevicePermissions))),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });
  
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
        failure: "ScriptNotFoundError",
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

  // get one task lists
  app.get('/api/permissions/tasklists/:id', async (req, res) => {
    const response =  await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("taskLists", ({ token }) => service.findTaskLists(token, TaskId(req.params.id))),
      Effect.map(({ taskLists }) => Response(StatusCodes.OK, taskLists)),
      Effect.catch("__brand", {
          failure: "TaskListsNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // get all task lists
  app.get('/api/permissions/tasklists', async (req, res) => {
    const response =  await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("taskLists", ({ token }) => service.getAllTaskLists(token)),
      Effect.map(({ taskLists }) => Response(StatusCodes.OK, Array.from(taskLists))),
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
      Effect.bind("_", ({ token, email }) => service.addToBlacklist(token, Email(email), TaskId(req.params.id))),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "UserNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "InvalidOperationError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.CONFLICT, err))
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
      Effect.bind("_", ({ token, email }) => service.addToWhitelist(token, Email(email), TaskId(req.params.id))),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "UserNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "InvalidOperationError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.CONFLICT, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

// get one editlist
  app.get('/api/permissions/editlist/:id', async (req, res) => {
    const response =  await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("editList", ({ token }) => service.findEditList(token, TaskId(req.params.id))),
      Effect.map(({ editList }) => Response(StatusCodes.OK, editList)),
      Effect.catch("__brand", {
          failure: "EditListNotFoundError",
          onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // get all editlists
  app.get('/api/permissions/editlist', async (req, res) => {
    const response =  await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("editLists", ({ token }) => service.getAllEditLists(token)),
      Effect.map(({ editLists }) => Response(StatusCodes.OK, Array.from(editLists))),
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
      Effect.catch("__brand", {
        failure: "EditListNotFoundError",
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
      Effect.catch("__brand", {
        failure: "EditListNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });
}