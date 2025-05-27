/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, flatMap, catch as catch_, succeed, fail, mapError, map } from "effect/Effect";
import { PermissionError } from "../../ports/permissions-management/Errors.js";
import { ScriptNotFoundError, TaskNameAlreadyInUse, AutomationNameAlreadyInUse, InvalidScriptError } from "../../ports/scripts-management/Errors.js";
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js";
import { InvalidTokenError } from "../../ports/users-management/Errors.js";
import { Token } from "../users-management/Token.js";
import { TaskId, Task, AutomationId, Automation, TaskImpl, AutomationImpl, Script, ScriptId } from "./Script.js";
import { AutomationBuilder, ScriptBuilder, TaskBuilder } from "./ScriptBuilder.js";
import { ScriptRepository } from "../../ports/scripts-management/ScriptRepository.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js";
import { UsersService } from "../../ports/users-management/UserService.js";
import { pipe } from "effect";
import { DuplicateIdError, UniquenessConstraintViolatedError } from "../../ports/Repository.js";

export class ScriptsServiceImpl implements ScriptsService {
  constructor(
    private scriptRepository: ScriptRepository, 
    private devicesService: DevicesService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
    private permissionsService: PermissionsService
  ) {}

  findTask(token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findScript(token, taskId),
      flatMap(script => succeed(script as Task)),
    )
  }

  findTaskUnsafe(taskId: TaskId): Effect<Task, ScriptNotFoundError> {
    return pipe(
      this.scriptRepository.find(taskId),
      flatMap(script => succeed(script as Task)),
      mapError(err => {
        return ScriptNotFoundError(err.cause)
      })
    )
  }

  getAllTasks(token: Token): Effect<Iterable<Task>, InvalidTokenError> {
    return pipe(
      this.getAllScripts(token),
      flatMap(scripts => succeed(Array.from(scripts).filter(e => e instanceof TaskImpl)))
    )
  }

  createTask(token: Token, task: TaskBuilder): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUse | Array<InvalidScriptError>> {
    return pipe(
      this.createScript(token, task),
      map(id => id as TaskId),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "DuplicateIdError":
            case "UniquenessConstraintViolatedError":
              return TaskNameAlreadyInUse(err.cause)
          }
        }
        return err
      })
    )
  }

  editTask(token: Token, taskId: TaskId, task: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | TaskNameAlreadyInUse | Array<InvalidScriptError>> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => this.permissionsService.canEdit(token, taskId)),
      flatMap(() => task.buildWithId(taskId)),
      flatMap(task => this.scriptRepository.update(task)),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "NotFoundError":
              return ScriptNotFoundError(err.cause)
            case "UniquenessConstraintViolatedError":
              return TaskNameAlreadyInUse(err.cause)
          }
        }
        return err
      })
    )
  }

  startTask(token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    throw new Error("Method not implemented.");
  }

  findAutomation(token: Token, automationId: AutomationId): Effect<Automation, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findScript(token, automationId),
      flatMap(script => succeed(script as Automation))
    )
  }

  getAllAutomations(token: Token): Effect<Iterable<Automation>, InvalidTokenError> {
    return pipe(
      this.getAllScripts(token),
      flatMap(scripts => succeed(Array.from(scripts).filter(e => e instanceof AutomationImpl)))
    )
  }

  createAutomation(token: Token, automation: AutomationBuilder): Effect<AutomationId, InvalidTokenError | AutomationNameAlreadyInUse | Array<InvalidScriptError>> {
    return pipe(
      this.createScript(token, automation),
      map(id => id as AutomationId),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "DuplicateIdError":
            case "UniquenessConstraintViolatedError":
              return AutomationNameAlreadyInUse(err.cause)
          }
        }
        return err
      })
    )
  }

  editAutomation(token: Token, automationId: AutomationId, automation: AutomationBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | AutomationNameAlreadyInUse | Array<InvalidScriptError>> {
    throw new Error("Method not implemented.");
  }

  setAutomationState(token: Token, automationId: AutomationId, enable: boolean): Effect<void, InvalidTokenError | ScriptNotFoundError> {
    throw new Error("Method not implemented.");
  }

  private getAllScripts(token: Token): Effect<Iterable<Script<ScriptId>>, InvalidTokenError> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => this.scriptRepository.getAll())
    )
  }

  private createScript(token: Token, scriptBuilder: ScriptBuilder<Script<ScriptId>>): Effect<ScriptId, DuplicateIdError | UniquenessConstraintViolatedError | InvalidTokenError | Array<InvalidScriptError>> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => scriptBuilder.build()),
      flatMap(automation =>
        pipe(
          this.scriptRepository.add(automation),
          flatMap(() => succeed(automation.id)) 
        )
      )
    )
  }

  private findScript(token: Token, scriptId: ScriptId): Effect<Script<ScriptId>, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => this.scriptRepository.find(scriptId)),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: err => fail(ScriptNotFoundError(err.cause))
      }),
    )
  }
}