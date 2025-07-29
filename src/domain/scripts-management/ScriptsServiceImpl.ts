import { Effect, flatMap, catch as catch_, succeed, fail, mapError, map, forkDaemon, runFork, forEach, sleep, andThen, runPromise, sync, tap, if as if_ } from "effect/Effect";
import { PermissionError } from "../../ports/permissions-management/Errors.js";
import { ScriptNotFoundError, TaskNameAlreadyInUseError, AutomationNameAlreadyInUseError, InvalidScriptError, ScriptError } from "../../ports/scripts-management/Errors.js";
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js";
import { InvalidTokenError } from "../../ports/users-management/Errors.js";
import { Token } from "../users-management/Token.js";
import { TaskId, Task, AutomationId, Automation, TaskImpl, AutomationImpl, Script, ScriptId } from "./Script.js";
import { AutomationBuilder, ScriptBuilder, TaskBuilder } from "./ScriptBuilder.js";
import { ScriptRepository } from "../../ports/scripts-management/ScriptRepository.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js";
import { UsersService } from "../../ports/users-management/UsersService.js";
import { Fiber, pipe } from "effect";
import { NotFoundError, UniquenessConstraintViolatedError } from "../../ports/Repository.js";
import { DeviceEventsService, DeviceEventsSubscriber } from "../../ports/devices-management/DeviceEventsService.js";
import { DeviceId, DeviceEvent } from "../devices-management/Device.js";
import { DeviceEventTrigger, DeviceEventTriggerImpl, PeriodTrigger, PeriodTriggerImpl } from "./Trigger.js";
import { millis, seconds } from "effect/Duration";
import { DeviceActionsService } from "../../ports/devices-management/DeviceActionsService.js";
import { isDeviceActionInstruction } from "./Instruction.js";

export class ScriptsServiceImpl implements ScriptsService, DeviceEventsSubscriber {
  private automationsFiberMap: Map<AutomationId, Fiber.RuntimeFiber<undefined, ScriptError | NotFoundError>> = new Map()

  constructor(
    private scriptRepository: ScriptRepository,
    private devicesService: DevicesService,
    private deviceActionsService: DeviceActionsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
    private permissionsService: PermissionsService,
    deviceEventsService: DeviceEventsService
  ) {
    deviceEventsService.subscribeForDeviceEvents(this)
    runPromise(this.scriptRepository.getAll())
      .then(scripts => this.startAutomationsHandler(Array.from(scripts).filter(e => e instanceof AutomationImpl)))

  }

  findTask(token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findScript(token, taskId),
      flatMap(script => if_(script instanceof TaskImpl, {
        onTrue: () => succeed(script as Task),
        onFalse: () => fail(ScriptNotFoundError("It was found an automation but not a task with this id: " + taskId))
      }))
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

  createTask(token: Token, task: TaskBuilder): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUseError | InvalidScriptError> {
    return pipe(
      this.createScript(token, task),
      flatMap(script =>
        pipe(
          this.scriptRepository.add(script),
          flatMap(() => this.permissionsService.addToEditlistUnsafe(token.userEmail, script.id)),
          catch_("__brand", {
            failure: "ScriptNotFoundError",
            onFailure: () => succeed(undefined)
          }),
          catch_("__brand", {
            failure: "EditListNotFoundError",
            onFailure: () => succeed(undefined)
          }),
          flatMap(() => succeed(script.id))
        )
      ),
      map(id => id as TaskId),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "DuplicateIdError":
            case "UniquenessConstraintViolatedError":
              return TaskNameAlreadyInUseError(err.cause)
            case "UserNotFoundError": return InvalidTokenError("This token references a deleted user")
          }
        }
        return err
      })
    )
  }

  editTask(token: Token, taskId: TaskId, task: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | TaskNameAlreadyInUseError | InvalidScriptError> {
    return pipe(
      this.editScript(token, taskId, task),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "UniquenessConstraintViolatedError":
              return TaskNameAlreadyInUseError(err.cause)
          }
        }
        return err
      })
    )
  }

  startTask(token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return pipe(
      this.permissionsService.canExecuteTask(token, taskId),
      flatMap(() => this.findTask(token, taskId)),
      flatMap(task => forkDaemon(task.execute(this.notificationsService, this, this.permissionsService, this.devicesService, this.deviceActionsService, token)))
    )
  }

  removeTask(token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return this.removeScript(token, taskId)
  }
  findAutomation(token: Token, automationId: AutomationId): Effect<Automation, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findScript(token, automationId),
      flatMap(script => if_(script instanceof AutomationImpl, {
        onTrue: () => succeed(script as Automation),
        onFalse: () => fail(ScriptNotFoundError("It was found a task but not an automation with this id: " + automationId))
      }))
    )
  }
  findAutomationUnsafe(automationId: AutomationId): Effect<Automation, ScriptNotFoundError> {
    return pipe(
      this.scriptRepository.find(automationId),
      flatMap(script => succeed(script as Automation)),
      mapError(err => {
        return ScriptNotFoundError(err.cause)
      })
    )
  }

  getAllAutomations(token: Token): Effect<Iterable<Automation>, InvalidTokenError> {
    return pipe(
      this.getAllScripts(token),
      flatMap(scripts => succeed(Array.from(scripts).filter(e => e instanceof AutomationImpl)))
    )
  }

  createAutomation(token: Token, automation: AutomationBuilder, id: AutomationId | undefined = undefined): Effect<AutomationId, InvalidTokenError | AutomationNameAlreadyInUseError | InvalidScriptError | PermissionError> {
    return pipe(
      this.createScript(token, automation, id),
      flatMap((automation) => this.checkAutomationActionsPermissions(token, automation as Automation)),
      flatMap(automation =>
        pipe(
          this.scriptRepository.add(automation),
          flatMap(() => this.permissionsService.addToEditlistUnsafe(token.userEmail, automation.id)),
          catch_("__brand", {
            failure: "ScriptNotFoundError",
            onFailure: () => succeed(undefined)
          }),
          catch_("__brand", {
            failure: "EditListNotFoundError",
            onFailure: () => succeed(undefined)
          }),
          flatMap(() => succeed(automation.id))
        )
      ),
      map(id => id as AutomationId),
      flatMap(id => pipe(
        this.setAutomationState(token, id, true),
        map(() => id),
        catch_("__brand", {
          failure: "ScriptNotFoundError",
          onFailure: () => succeed(id)
        })
      )),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "DuplicateIdError":
            case "UniquenessConstraintViolatedError":
              return AutomationNameAlreadyInUseError(err.cause)
            case "UserNotFoundError": return InvalidTokenError("This token references a deleted user")
          }
        }
        return err
      })
    )
  }

  checkAutomationActionsPermissions(token: Token, automation: Automation): Effect<Automation, PermissionError | InvalidTokenError> {
    return pipe(
      forEach(automation.instructions, (instruction) => {
        if (isDeviceActionInstruction(instruction)) {
          return this.permissionsService.canExecuteActionOnDevice(token, instruction.deviceId)
        }
        return succeed(null)
      }),
      map(() => automation)
    )
  }

  deviceEventPublished(deviceId: DeviceId, event: DeviceEvent): void {
    runFork(
      pipe(
        this.scriptRepository.getAll(),
        flatMap(scripts => succeed(Array.from(scripts).filter(e => e instanceof AutomationImpl))),
        flatMap(automations => this.startDeviceEventTriggeredAutomations(automations, deviceId, event))
      )
    )
  }

  private startDeviceEventTriggeredAutomations(automations: Automation[], deviceId: DeviceId, event: DeviceEvent): Effect<void> {
    return forEach(automations, (automation) => {
      if (automation.trigger instanceof DeviceEventTriggerImpl && automation.enabled) {
        const deviceEventTrigger = automation.trigger as DeviceEventTrigger

        if (deviceId == deviceEventTrigger.deviceId && event.name == deviceEventTrigger.eventName) {
          runFork(this.startAutomation(automation))
        }
      }
      return succeed(undefined)
    })
  }

  private startAutomationsHandler(automations: Automation[]) {
    for (const automation of automations) {
      this.startAutomationHandler(automation)
    }
  }

  private startAutomationHandler(automation: Automation) {
    if (automation.trigger instanceof PeriodTriggerImpl) {
      const periodTrigger = automation.trigger as PeriodTrigger

      runFork(pipe(
        this.waitToStart(periodTrigger),
        flatMap(() => forkDaemon(this.periodLoop(automation, periodTrigger))),
        tap(fiber =>
          sync(() => this.automationsFiberMap.set(automation.id, fiber))
        )
      ))
    }
  }

  private waitToStart(periodTrigger: PeriodTrigger): Effect<void> {
    const delay = periodTrigger.start.getMilliseconds() - new Date().getMilliseconds()
    return delay > 0 ? sleep(millis(delay)) : succeed(null)
  }

  private periodLoop(automation: Automation, periodTrigger: PeriodTrigger): Effect<undefined, ScriptError | NotFoundError> {
    return pipe(
      this.startAutomation(automation),
      andThen(() => sleep(seconds(periodTrigger.periodSeconds))),
      andThen(() => this.periodLoop(automation, periodTrigger))
    )
  }

  private startAutomation(automation: Automation) {
    return automation.execute(this.notificationsService, this, this.permissionsService, this.devicesService, this.deviceActionsService)
  }

  editAutomation(token: Token, automationId: AutomationId, automation: AutomationBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | AutomationNameAlreadyInUseError | InvalidScriptError> {
    return pipe(
      this.createScript(token, automation, automationId),
      flatMap(script => this.checkAutomationActionsPermissions(token, (script as Automation))),
      flatMap(() => this.removeAutomation(token, automationId)),
      flatMap(() => this.createAutomation(token, automation, automationId))
    )
  }

  setAutomationState(token: Token, automationId: AutomationId, enable: boolean): Effect<void, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findAutomation(token, automationId),
      flatMap(automation => pipe(
        sync(() => automation.enabled = enable),
        flatMap(() => if_(enable, {
          onTrue: () => succeed(this.startAutomationHandler(automation)),
          onFalse: () =>
            if_(this.automationsFiberMap.get(automationId) != undefined, {
              onTrue: () => pipe(
                Fiber.interrupt(this.automationsFiberMap.get(automationId)!)
              ),
              onFalse: () => succeed(null)
            }),
        })),
        flatMap(() => this.scriptRepository.update(automation))
      )),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: () => succeed(undefined)
      }),
      catch_("__brand", {
        failure: "UniquenessConstraintViolatedError",
        onFailure: () => succeed(undefined)
      })
    )
  }

  removeAutomation(token: Token, automationId: AutomationId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return pipe(
      if_(this.automationsFiberMap.get(automationId) != undefined, {
        onTrue: () => pipe(
          Fiber.interrupt(this.automationsFiberMap.get(automationId)!),
          tap(() => this.automationsFiberMap.delete(automationId))
        ),
        onFalse: () => succeed(null)
      }),
      flatMap(() => this.removeScript(token, automationId))
    )
  }

  private getAllScripts(token: Token): Effect<Iterable<Script<ScriptId>>, InvalidTokenError> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => this.scriptRepository.getAll())
    )
  }

  private createScript(token: Token, scriptBuilder: ScriptBuilder<Script<ScriptId>>, id: ScriptId | undefined = undefined): Effect<Script<ScriptId>, InvalidTokenError | InvalidScriptError> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => if_(id != undefined, {
        onTrue: () => scriptBuilder.buildWithId(id!),
        onFalse: () => scriptBuilder.build()
      }))
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

  private editScript(token: Token, scriptId: ScriptId, scriptBuilder: ScriptBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | UniquenessConstraintViolatedError | InvalidScriptError> {
    return pipe(
      this.permissionsService.canEdit(token, scriptId),
      flatMap(() => scriptBuilder.buildWithId(scriptId)),
      flatMap(script => this.scriptRepository.update(script)),
      mapError(err => {
        if ("__brand" in err) {
          switch (err.__brand) {
            case "NotFoundError":
              return ScriptNotFoundError(err.cause)
          }
        }
        return err
      })
    )
  }

  private removeScript(token: Token, scriptId: ScriptId): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError, never> {
    return pipe(
      this.permissionsService.canEdit(token, scriptId),
      flatMap(() => this.scriptRepository.remove(scriptId)),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: err => fail(ScriptNotFoundError(err.cause))
      })
    );
  }
}