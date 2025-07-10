import { DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { InvalidOperationError, PermissionError } from "../../ports/permissions-management/Errors.js";
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js";
import { DeviceId } from "../devices-management/Device.js";
import { Token } from "../users-management/Token.js";
import { Email, Role } from "../users-management/User.js";
import { UserDevicePermissionRepository } from "../../ports/permissions-management/UserDevicePermissionRepository.js";
import { UsersService } from "../../ports/users-management/UsersService.js";
import { Effect, pipe } from "effect";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { InvalidTokenError, TokenError, UnauthorizedError, UserNotFoundError } from "../../ports/users-management/Errors.js";
import { TaskListsRepository } from "../../ports/permissions-management/TaskListsRepository.js";
import { EditListRepository } from "../../ports/permissions-management/EditListRepository.js";
import { UserDevicePermission } from "./UserDevicePermission.js";
import { ScriptId, Task, TaskId } from "../scripts-management/Script.js";
import { ScriptNotFoundError } from "../../ports/scripts-management/Errors.js";
import { EditList } from "./EditList.js";
import { TaskLists } from "./TaskLists.js";
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js";
import { DeviceActionInstruction, Instruction } from "../scripts-management/Instruction.js";

export class PermissionsServiceImpl implements PermissionsService {

  private userDevicePermissionRepo: UserDevicePermissionRepository;
  private taskListsRepo: TaskListsRepository;
  private editListRepo: EditListRepository;
  private usersService: UsersService
  private deviceService: DevicesService;
  private scriptService!: ScriptsService;

  constructor(userDevicePermissionRepo: UserDevicePermissionRepository, taskListsRepo: TaskListsRepository, editListRepo: EditListRepository, usersService: UsersService, devicesService: DevicesService) {
    this.userDevicePermissionRepo = userDevicePermissionRepo;
    this.taskListsRepo = taskListsRepo;
    this.editListRepo = editListRepo;
    this.usersService = usersService;
    this.deviceService = devicesService;
  }

  registerScriptService(scriptService: ScriptsService): void {
    this.scriptService = scriptService;
  }

  addUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect.Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => this.deviceService.find(token, deviceId)),
      Effect.flatMap(() => this.userDevicePermissionRepo.add(UserDevicePermission(email, deviceId))),
      Effect.catch("__brand", {
        failure: "DuplicateIdError",
        onFailure: () => Effect.succeed(null)
      })
    )
  }
  addUserDevicePermissionUnsafe(token: Token, email: Email, deviceId: DeviceId): Effect.Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => this.deviceService.find(token, deviceId)),
      Effect.flatMap(() => this.userDevicePermissionRepo.add(UserDevicePermission(email, deviceId))),
      Effect.catch("__brand", {
        failure: "DuplicateIdError",
        onFailure: () => Effect.succeed(undefined as void)
      })
    )
  }
  removeUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect.Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => this.deviceService.find(token, deviceId)),
      Effect.flatMap(() => this.userDevicePermissionRepo.remove([email, deviceId])),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.succeed(null)
      })
    )
  }
  removeUserDevicePermissionUnsafe(token: Token, email: Email, deviceId: DeviceId): Effect.Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
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
  canExecuteTask(token: Token, taskId: TaskId): Effect.Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.usersService.verifyToken(token),
      Effect.flatMap(() => 
        pipe(
          this.taskListsRepo.find(taskId),
          Effect.flatMap((taskList): Effect.Effect<Task | undefined, PermissionError | InvalidTokenError | ScriptNotFoundError> => {
            if (taskList.whitelist?.includes(token.userEmail)) {
              return Effect.succeed(undefined);
            }
            if (taskList.blacklist?.includes(token.userEmail)) {
              return Effect.fail(PermissionError("User is blacklisted"));
            }
            return pipe(
              this.scriptService.findTask(token, taskId),
            );
          }),
          Effect.catch("__brand", {
            failure: "NotFoundError",
            onFailure: () =>
              pipe(
                this.scriptService.findTask(token, taskId),
              )
          })
        )
      ),
      Effect.flatMap((task) => {
        if (task === undefined) {
          return Effect.succeed(undefined);
        } 
        
        const deviceChecks = task.instructions
          .filter(isDeviceActionInstruction)
          .map(instruction => 
            this.canExecuteActionOnDevice(token, instruction.deviceId)
          );
        
        return pipe(
          Effect.all(deviceChecks),
          Effect.map(() => undefined as void)
        );
      }),
      Effect.mapError(e => {
          switch (e.__brand) {
            case "ScriptNotFoundError":
              return ScriptNotFoundError(e.cause)
            case "PermissionError":
              return PermissionError(e.cause)
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
      Effect.if(token.role === Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => {
        const list = EditList(scriptId, []);
        return pipe(
          this.editListRepo.add(list),
          Effect.flatMap(() => Effect.succeed(list)),
          Effect.catch("__brand", {
            failure: "DuplicateIdError",
            onFailure: () => this.editListRepo.find(scriptId)
          })
        );
      }),
      Effect.flatMap((editList) => {
        editList.addUserToUsers(email);
        return this.editListRepo.update(editList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    );
  }
  addToEditlistUnsafe(token: Token, email: Email, scriptId: ScriptId): Effect.Effect<void, UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => {
        const list = EditList(scriptId, []);
        return pipe(
          this.editListRepo.add(list),
          Effect.flatMap(() => Effect.succeed(list)),
          Effect.catch("__brand", {
            failure: "DuplicateIdError",
            onFailure: () => this.editListRepo.find(scriptId)
          })
        );
      }),
      Effect.flatMap((editList) => {
        editList.addUserToUsers(email);
        return this.editListRepo.update(editList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    );
  }
  removeFromEditlist(token: Token, email: Email, scriptId: ScriptId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      Effect.if(token.role == Role.Admin, {
        onTrue: () => this.usersService.verifyToken(token),
        onFalse: () => Effect.fail(UnauthorizedError())
      }),
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => this.editListRepo.find(scriptId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((editList) => {
        editList.removeUserToUsers(email);
        return this.editListRepo.update(editList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  removeFromEditlistUnsafe(token: Token, email: Email, scriptId: ScriptId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => this.editListRepo.find(scriptId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((editList) => {
        editList.removeUserToUsers(email);
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
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => {
        const list = TaskLists(taskId, [], []);
        return pipe(
          this.taskListsRepo.add(list),
          Effect.flatMap(() => Effect.succeed(list)),
          Effect.catch("__brand", {
            failure: "DuplicateIdError",
            onFailure: () => this.taskListsRepo.find(taskId)
          })
        );
      }),
      Effect.flatMap((taskList) => {
        return Effect.if(taskList.blacklist.includes(email), {
          onTrue: () => Effect.fail(InvalidOperationError("User is blacklisted")),
          onFalse: () => {
            taskList.addEmailToWhitelist(email);
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
  addToWhitelistUnsafe(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => {
        const list = TaskLists(taskId, [], []);
        return pipe(
          this.taskListsRepo.add(list),
          Effect.flatMap(() => Effect.succeed(list)),
          Effect.catch("__brand", {
            failure: "DuplicateIdError",
            onFailure: () => this.taskListsRepo.find(taskId)
          })
        );
      }),
      Effect.flatMap((taskList) => {
        return Effect.if(taskList.blacklist.includes(email), {
          onTrue: () => Effect.fail(InvalidOperationError("User is blacklisted")),
          onFalse: () => {
            taskList.addEmailToWhitelist(email);
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
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        taskList.removeEmailFromWhitelist(email);
        return this.taskListsRepo.update(taskList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  removeFromWhitelistUnsafe(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        taskList.removeEmailFromWhitelist(email);
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
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => {
        const list = TaskLists(taskId, [], []);
        return pipe(
          this.taskListsRepo.add(list),
          Effect.flatMap(() => Effect.succeed(list)),
          Effect.catch("__brand", {
            failure: "DuplicateIdError",
            onFailure: () => this.taskListsRepo.find(taskId)
          })
        );
      }),
      Effect.flatMap((taskList) => {
        return Effect.if(taskList.whitelist.includes(email), {
          onTrue: () => Effect.fail(InvalidOperationError("User is whitelisted")),
          onFalse: () => {
            taskList.addEmailToBlacklist(email);
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
  addToBlacklistUnsafe(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => {
        const list = TaskLists(taskId, [], []);
        return pipe(
          this.taskListsRepo.add(list),
          Effect.flatMap(() => Effect.succeed(list)),
          Effect.catch("__brand", {
            failure: "DuplicateIdError",
            onFailure: () => this.taskListsRepo.find(taskId)
          })
        );
      }),
      Effect.flatMap((taskList) => {
        return Effect.if(taskList.whitelist.includes(email), {
          onTrue: () => Effect.fail(InvalidOperationError("User is whitelisted")),
          onFalse: () => {
            taskList.addEmailToBlacklist(email);
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
      Effect.flatMap(() => this.usersService.getUserDataUnsafe(email)),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        taskList.removeEmailFromBlacklist(email);
        return this.taskListsRepo.update(taskList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }
  removeFromBlacklistUnsafe(token: Token, email: Email, taskId: TaskId): Effect.Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      Effect.flatMap(() => this.taskListsRepo.find(taskId)),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      }),
      Effect.flatMap((taskList) => {
        taskList.removeEmailFromBlacklist(email);
        return this.taskListsRepo.update(taskList);
      }),
      Effect.catch("__brand", {
        failure: "NotFoundError",
        onFailure: () => Effect.fail(ScriptNotFoundError())
      })
    )
  }

}

function isDeviceActionInstruction(instruction: Instruction): instruction is DeviceActionInstruction {
  return instruction && 
         typeof instruction === 'object' &&
         'deviceId' in instruction && 
         'deviceActionId' in instruction && 
         'input' in instruction;
}