import { DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { InvalidOperationError, PermissionError, TaskNotFoundError } from "../../ports/permissions-management/Errors.js";
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js";
import { DeviceId } from "../devices-management/Device.js";
import { Token } from "../users-management/Token.js";
import { Email, Role } from "../users-management/User.js";
import { UserDevicePermissionRepository } from "../../ports/permissions-management/UserDevicePermissionRepository.js";
import { UsersService } from "../../ports/users-management/UserService.js";
import { Effect, pipe } from "effect";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { InvalidTokenError, TokenError, UnauthorizedError, UserNotFoundError } from "../../ports/users-management/Errors.js";
import { TaskListsRepository } from "../../ports/permissions-management/TaskListsRepository.js";
import { EditListRepository } from "../../ports/permissions-management/EditListRepository.js";
import { UserRepository } from "../../ports/users-management/UserRepository.js";
import { UserDevicePermission } from "./UserDevicePermission.js";
import { ScriptId, TaskId } from "../scripts-management/Script.js";
import { ScriptNotFoundError } from "../../ports/scripts-management/Errors.js";

export class PermissionsServiceImpl implements PermissionsService {

  private userDevicePermissionRepo: UserDevicePermissionRepository;
  private taskListsRepo: TaskListsRepository;
  private editListRepo: EditListRepository;
  private userRepo: UserRepository;
  private usersService: UsersService
  private deviceService: DevicesService;

  constructor(userDevicePermissionRepo: UserDevicePermissionRepository, taskListsRepo: TaskListsRepository, editListRepo: EditListRepository, userRepo: UserRepository, usersService: UsersService, devicesService: DevicesService) {
    this.userDevicePermissionRepo = userDevicePermissionRepo;
    this.taskListsRepo = taskListsRepo;
    this.editListRepo = editListRepo;
    this.usersService = usersService;
    this.userRepo = userRepo;
    this.deviceService = devicesService;
  }


  addUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect.Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.mapError(e => {
        switch (e.__brand) {
          case "NotFoundError":
            return UserNotFoundError(e.cause)
          default:
            return e
        }
      }),
      Effect.flatMap(() => this.deviceService.find(token, deviceId)),
      Effect.flatMap(() => this.userDevicePermissionRepo.add(UserDevicePermission(email, deviceId))),
      Effect.catch("__brand", {
        failure: "DuplicateIdError",
        onFailure: () => Effect.succeed(null)
      })
    )
  }
  removeUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect.Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.mapError(e => {
        switch (e.__brand) {
          case "NotFoundError":
            return UserNotFoundError(e.cause)
          default:
            return e
        }
      }),
      Effect.flatMap(() => this.deviceService.find(token, deviceId)),
      Effect.flatMap(() => this.userDevicePermissionRepo.remove([email, deviceId])),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.succeed(null)
      })
    )
  }
  canExecuteActionOnDevice(token: Token, deviceId: DeviceId): Effect.Effect<void, PermissionError | InvalidTokenError> {
    return pipe(
      this.usersService.verifyToken(token),
      Effect.flatMap(() => this.userDevicePermissionRepo.find([token.userEmail, deviceId])),
      Effect.mapError(e => {
        switch (e.__brand) {
          case "NotFoundError":
            return PermissionError(e.cause)
          default:
            return e
        }
      })
    )
  }
  canExecuteTask(token: Token, taskId: TaskId): Effect.Effect<void, PermissionError | InvalidTokenError | TaskNotFoundError> {
    return pipe(
      this.usersService.verifyToken(token),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.flatMap((task) =>
        Effect.if(task.blacklist.includes(token.userEmail), {
          onTrue: () => Effect.fail(PermissionError("User is blacklisted")),
          onFalse: () => Effect.succeed(task)
        }),
      ),
      Effect.mapError(e => {
        switch (e.__brand) {
          case "NotFoundError":
            return TaskNotFoundError(e.cause)
          default:
            return e
        }
      })
    )
  }

  canEdit(token: Token, scriptId: ScriptId): Effect.Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.usersService.verifyToken(token),
      Effect.flatMap(() => this.editListRepo.find(scriptId)),
      Effect.flatMap((editList) =>
        Effect.if(editList.users.includes(token.userEmail), {
          onTrue: () => Effect.succeed(editList),
          onFalse: () => Effect.fail(PermissionError("User is blacklisted"))
        }),
      ),
      Effect.mapError(e => {
        switch (e.__brand) {
          case "NotFoundError":
            return ScriptNotFoundError(e.cause)
          default:
            return e
        }
      })
    )
  }

  addToEditlist(token: Token, email: Email, scriptId: ScriptId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(UserNotFoundError())
      }),
      Effect.flatMap(() => this.editListRepo.find(scriptId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((editList) => {
        editList.addUserToUsers(token.userEmail);
        return this.editListRepo.update(editList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  removeFromEditlist(token: Token, email: Email, scriptId: ScriptId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(UserNotFoundError())
      }),
      Effect.flatMap(() => this.editListRepo.find(scriptId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((editList) => {
        editList.removeUserToUsers(token.userEmail);
        return this.editListRepo.update(editList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }

  addToWhitelist(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(UserNotFoundError())
      }),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        return Effect.if(taskList.blacklist.includes(email), {
          onTrue: () => Effect.fail(InvalidOperationError("User is blacklisted")),
          onFalse: () => {
            taskList.addEmailToWhitelist(token.userEmail);
            return this.taskListsRepo.update(taskList);
          }
        })
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  removeFromWhitelist(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(UserNotFoundError())
      }),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        taskList.removeEmailFromWhitelist(token.userEmail);
        return this.taskListsRepo.update(taskList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  addToBlacklist(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(UserNotFoundError())
      }),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        return Effect.if(taskList.whitelist.includes(email), {
          onTrue: () => Effect.fail(InvalidOperationError("User is whitelisted")),
          onFalse: () => {
            taskList.addEmailToBlacklist(token.userEmail);
            return this.taskListsRepo.update(taskList);
          }
        });
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  removeFromBlacklist(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.userRepo.find(email)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(UserNotFoundError())
      }),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        taskList.removeEmailFromBlacklist(token.userEmail);
        return this.taskListsRepo.update(taskList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }

}
