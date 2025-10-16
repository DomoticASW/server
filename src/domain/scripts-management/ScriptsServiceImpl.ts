import {
  Effect,
  flatMap,
  catch as catch_,
  succeed,
  fail,
  mapError,
  map,
  forkDaemon,
  runFork,
  forEach,
  sleep,
  andThen,
  runPromise,
  sync,
  tap,
  if as if_,
  Do,
  bind,
} from "effect/Effect"
import { PermissionError } from "../../ports/permissions-management/Errors.js"
import {
  ScriptNotFoundError,
  TaskNameAlreadyInUseError,
  AutomationNameAlreadyInUseError,
  InvalidScriptError,
  ScriptError,
} from "../../ports/scripts-management/Errors.js"
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js"
import { InvalidTokenError, UserNotFoundError } from "../../ports/users-management/Errors.js"
import { Token } from "../users-management/Token.js"
import {
  TaskId,
  Task,
  AutomationId,
  Automation,
  TaskImpl,
  AutomationImpl,
  Script,
  ScriptId,
} from "./Script.js"
import { AutomationBuilder, ScriptBuilder, TaskBuilder } from "./ScriptBuilder.js"
import { ScriptRepository } from "../../ports/scripts-management/ScriptRepository.js"
import { DevicesService } from "../../ports/devices-management/DevicesService.js"
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js"
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js"
import { UsersService } from "../../ports/users-management/UsersService.js"
import { Fiber, pipe } from "effect"
import { NotFoundError, UniquenessConstraintViolatedError } from "../../ports/Repository.js"
import {
  DeviceEventsService,
  DeviceEventsSubscriber,
} from "../../ports/devices-management/DeviceEventsService.js"
import { DeviceId, DeviceEvent } from "../devices-management/Device.js"
import {
  DeviceEventTrigger,
  DeviceEventTriggerImpl,
  PeriodTrigger,
  PeriodTriggerImpl,
} from "./Trigger.js"
import { millis, seconds } from "effect/Duration"
import { DeviceActionsService } from "../../ports/devices-management/DeviceActionsService.js"
import {
  Instruction,
  isDeviceActionInstruction,
  isIfElseInstruction,
  isIfInstruction,
  isStartTaskInstruction,
} from "./Instruction.js"

export class ScriptsServiceImpl implements ScriptsService, DeviceEventsSubscriber {
  private automationsFiberMap: Map<
    AutomationId,
    Fiber.RuntimeFiber<undefined, ScriptError | NotFoundError | UserNotFoundError>
  > = new Map()
  private startedAutomations: Map<AutomationId, boolean> = new Map()

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
    runPromise(this.scriptRepository.getAll()).then((scripts) =>
      this.startAutomationsHandler(
        Array.from(scripts)
          .filter((e) => e instanceof AutomationImpl)
          .filter((e) => e.enabled)
      )
    )
  }

  findTask(token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findScript(token, taskId),
      flatMap((script) =>
        if_(script instanceof TaskImpl, {
          onTrue: () => succeed(script as Task),
          onFalse: () =>
            fail(
              ScriptNotFoundError(
                "It was found an automation but not a task with this id: " + taskId
              )
            ),
        })
      )
    )
  }

  findTaskUnsafe(taskId: TaskId): Effect<Task, ScriptNotFoundError> {
    return pipe(
      this.scriptRepository.find(taskId),
      flatMap((script) => succeed(script as Task)),
      mapError((err) => {
        return ScriptNotFoundError(err.cause)
      })
    )
  }

  getAllTasks(token: Token): Effect<Iterable<Task>, InvalidTokenError> {
    return pipe(
      this.getAllScripts(token),
      flatMap((scripts) => succeed(Array.from(scripts).filter((e) => e instanceof TaskImpl)))
    )
  }

  createTask(
    token: Token,
    task: TaskBuilder
  ): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUseError | InvalidScriptError> {
    return Do.pipe(
      bind("script", () => this.createScript(token, task)),
      bind("task", ({ script }) => succeed(script as Task)),
      bind("__", ({ task }) => this.scriptRepository.add(task)),
      bind("___", ({ task }) =>
        pipe(
          this.permissionsService.addToEditlistUnsafe(token.userEmail, task.id),
          catch_("__brand", {
            failure: "ScriptNotFoundError",
            onFailure: () => this.scriptRepository.remove(task.id),
          }),
          catch_("__brand", {
            failure: "EditListNotFoundError",
            onFailure: () => this.scriptRepository.remove(task.id),
          }),
          catch_("__brand", {
            failure: "UserNotFoundError",
            onFailure: () => {
              return pipe(
                this.scriptRepository.remove(task.id),
                flatMap(() => fail(InvalidTokenError("This token references a deleted user")))
              )
            },
          })
        )
      ),
      map(({ task }) => task.id),
      mapError((err) => {
        switch (err.__brand) {
          case "DuplicateIdError":
          case "UniquenessConstraintViolatedError":
            return TaskNameAlreadyInUseError(err.cause)
          case "NotFoundError":
            return InvalidTokenError(err.cause)
        }
        return err
      })
    )
  }

  editTask(
    token: Token,
    taskId: TaskId,
    task: TaskBuilder
  ): Effect<
    void,
    | InvalidTokenError
    | PermissionError
    | ScriptNotFoundError
    | TaskNameAlreadyInUseError
    | InvalidScriptError
  > {
    return pipe(
      this.editScript(token, taskId, task, false),
      mapError((err) => {
        switch (err.__brand) {
          case "UniquenessConstraintViolatedError":
            return TaskNameAlreadyInUseError(err.cause)
        }
        return err
      })
    )
  }

  startTask(
    token: Token,
    taskId: TaskId
  ): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return pipe(
      this.permissionsService.canExecuteTask(token, taskId),
      flatMap(() => this.findTask(token, taskId)),
      flatMap((task) =>
        forkDaemon(
          pipe(
            task.execute(
              this.notificationsService,
              this,
              this.permissionsService,
              this.devicesService,
              this.deviceActionsService,
              token
            ),
            catch_("__brand", {
              failure: "ScriptError",
              onFailure: (err) =>
                pipe(
                  this.usersService.getAdmin(),
                  flatMap((admin) =>
                    this.notificationsService.sendNotification(
                      admin.email,
                      "While executing the task " + task.name + " an error occurred: " + err.cause
                    )
                  )
                ),
            })
          )
        )
      )
    )
  }

  removeTask(
    token: Token,
    taskId: TaskId
  ): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return this.removeScript(token, taskId)
  }
  findAutomation(
    token: Token,
    automationId: AutomationId
  ): Effect<Automation, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.findScript(token, automationId),
      flatMap((script) =>
        if_(script instanceof AutomationImpl, {
          onTrue: () => succeed(script as Automation),
          onFalse: () =>
            fail(
              ScriptNotFoundError(
                "It was found a task but not an automation with this id: " + automationId
              )
            ),
        })
      )
    )
  }
  findAutomationUnsafe(automationId: AutomationId): Effect<Automation, ScriptNotFoundError> {
    return pipe(
      this.scriptRepository.find(automationId),
      flatMap((script) => succeed(script as Automation)),
      mapError((err) => {
        return ScriptNotFoundError(err.cause)
      })
    )
  }

  getAllAutomations(token: Token): Effect<Iterable<Automation>, InvalidTokenError> {
    return pipe(
      this.getAllScripts(token),
      flatMap((scripts) => succeed(Array.from(scripts).filter((e) => e instanceof AutomationImpl)))
    )
  }
  createAutomation(
    token: Token,
    automation: AutomationBuilder
  ): Effect<
    AutomationId,
    InvalidTokenError | AutomationNameAlreadyInUseError | InvalidScriptError | PermissionError
  > {
    return Do.pipe(
      bind("script", () => this.createScript(token, automation)),
      bind("automation", ({ script }) => succeed(script as Automation)),
      bind("_", ({ automation }) =>
        this.checkAutomationActionsPermissions(token, automation.instructions)
      ),
      bind("__", ({ automation }) => this.scriptRepository.add(automation)),
      bind("___", ({ automation }) =>
        pipe(
          this.permissionsService.addToEditlistUnsafe(token.userEmail, automation.id),
          catch_("__brand", {
            failure: "ScriptNotFoundError",
            onFailure: () => this.scriptRepository.remove(automation.id),
          }),
          catch_("__brand", {
            failure: "EditListNotFoundError",
            onFailure: () => this.scriptRepository.remove(automation.id),
          }),
          catch_("__brand", {
            failure: "UserNotFoundError",
            onFailure: () => {
              return pipe(
                this.scriptRepository.remove(automation.id),
                flatMap(() => fail(InvalidTokenError("This token references a deleted user")))
              )
            },
          })
        )
      ),
      bind("____", ({ automation }) =>
        pipe(
          this.setAutomationState(token, automation.id, true),
          catch_("__brand", {
            failure: "ScriptNotFoundError",
            onFailure: () => succeed(undefined),
          })
        )
      ),
      map(({ automation }) => automation.id),
      mapError((err) => {
        switch (err.__brand) {
          case "DuplicateIdError":
          case "UniquenessConstraintViolatedError":
            return AutomationNameAlreadyInUseError(err.cause)
          case "NotFoundError":
            return InvalidTokenError(err.cause)
          case "ScriptNotFoundError":
            return InvalidScriptError(err.cause)
        }
        return err
      })
    )
  }

  checkAutomationActionsPermissions(
    token: Token,
    instructions: Instruction[]
  ): Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      forEach(instructions, (instruction) => {
        if (isDeviceActionInstruction(instruction)) {
          return this.permissionsService.canExecuteActionOnDevice(token, instruction.deviceId)
        }
        if (isStartTaskInstruction(instruction)) {
          return this.permissionsService.canExecuteTask(token, instruction.taskId)
        }
        if (isIfElseInstruction(instruction)) {
          return pipe(
            this.checkAutomationActionsPermissions(token, instruction.then),
            flatMap(() => this.checkAutomationActionsPermissions(token, instruction.else))
          )
        } else if (isIfInstruction(instruction)) {
          return this.checkAutomationActionsPermissions(token, instruction.then)
        }
        return succeed(null)
      })
    )
  }

  deviceEventPublished(deviceId: DeviceId, event: DeviceEvent): void {
    runFork(
      pipe(
        this.scriptRepository.getAll(),
        flatMap((scripts) =>
          succeed(Array.from(scripts).filter((e) => e instanceof AutomationImpl))
        ),
        flatMap((automations) =>
          this.startDeviceEventTriggeredAutomations(automations, deviceId, event)
        )
      )
    )
  }

  private startDeviceEventTriggeredAutomations(
    automations: Automation[],
    deviceId: DeviceId,
    event: DeviceEvent
  ): Effect<void> {
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

      if (!this.startedAutomations.get(automation.id)) {
        runFork(
          pipe(
            succeed(this.startedAutomations.set(automation.id, true)),
            flatMap(() => this.waitToStart(periodTrigger)),
            flatMap(() => forkDaemon(this.periodLoop(automation, periodTrigger))),
            tap((fiber) => sync(() => this.automationsFiberMap.set(automation.id, fiber)))
          )
        )
      }
    }
  }

  private waitToStart(periodTrigger: PeriodTrigger): Effect<void> {
    const delay = periodTrigger.start.valueOf() - new Date().valueOf()
    return delay > 0 ? sleep(millis(delay)) : succeed(null)
  }

  private periodLoop(
    automation: Automation,
    periodTrigger: PeriodTrigger
  ): Effect<undefined, ScriptError | NotFoundError | UserNotFoundError> {
    return pipe(
      this.startAutomation(automation),
      andThen(() => sleep(seconds(periodTrigger.periodSeconds))),
      andThen(() => this.periodLoop(automation, periodTrigger))
    )
  }

  private startAutomation(automation: Automation) {
    return pipe(
      automation.execute(
        this.notificationsService,
        this,
        this.permissionsService,
        this.devicesService,
        this.deviceActionsService
      ),
      catch_("__brand", {
        failure: "ScriptError",
        onFailure: (err) =>
          pipe(
            this.usersService.getAdmin(),
            flatMap((admin) =>
              this.notificationsService.sendNotification(
                admin.email,
                "While executing the automation " +
                  automation.name +
                  " an error occurred: " +
                  err.cause
              )
            )
          ),
      })
    )
  }

  editAutomation(
    token: Token,
    automationId: AutomationId,
    automation: AutomationBuilder
  ): Effect<
    void,
    | InvalidTokenError
    | PermissionError
    | ScriptNotFoundError
    | AutomationNameAlreadyInUseError
    | InvalidScriptError
  > {
    return Do.pipe(
      bind("oldAutomation", () => this.findAutomation(token, automationId)),
      bind("_", () => this.editScript(token, automationId, automation, true)),
      bind("__", () =>
        if_(this.automationsFiberMap.get(automationId) != undefined, {
          onTrue: () =>
            pipe(
              Fiber.interrupt(this.automationsFiberMap.get(automationId)!),
              map(() => this.automationsFiberMap.delete(automationId)),
              map(() => this.startedAutomations.set(automationId, false))
            ),
          onFalse: () => succeed(null),
        })
      ),
      bind("___", ({ oldAutomation }) =>
        this.setAutomationState(token, automationId, oldAutomation.enabled)
      ),
      mapError((err) => {
        switch (err.__brand) {
          case "UniquenessConstraintViolatedError":
            return AutomationNameAlreadyInUseError(err.cause)
        }
        return err
      })
    )
  }

  setAutomationState(
    token: Token,
    automationId: AutomationId,
    enable: boolean
  ): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return pipe(
      this.findAutomation(token, automationId),
      flatMap((automation) =>
        pipe(
          this.permissionsService.canEdit(token, automationId),
          flatMap(() =>
            if_(enable, {
              onTrue: () => pipe(succeed(this.startAutomationHandler(automation))),
              onFalse: () =>
                if_(this.automationsFiberMap.get(automationId) !== undefined, {
                  onTrue: () =>
                    pipe(
                      Fiber.interrupt(this.automationsFiberMap.get(automationId)!),
                      map(() => this.startedAutomations.set(automationId, false))
                    ),
                  onFalse: () => succeed(null),
                }),
            })
          ),
          tap(() => (automation.enabled = enable)),
          flatMap(() => this.scriptRepository.update(automation))
        )
      ),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: () => succeed(undefined),
      }),
      catch_("__brand", {
        failure: "UniquenessConstraintViolatedError",
        onFailure: () => succeed(undefined),
      })
    )
  }

  removeAutomation(
    token: Token,
    automationId: AutomationId
  ): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
    return pipe(
      if_(this.automationsFiberMap.get(automationId) != undefined, {
        onTrue: () =>
          pipe(
            Fiber.interrupt(this.automationsFiberMap.get(automationId)!),
            map(() => this.automationsFiberMap.delete(automationId)),
            map(() => this.startedAutomations.set(automationId, false))
          ),
        onFalse: () => succeed(null),
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

  private createScript(
    token: Token,
    scriptBuilder: ScriptBuilder<Script<ScriptId>>
  ): Effect<Script<ScriptId>, InvalidTokenError | InvalidScriptError> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => scriptBuilder.build())
    )
  }

  private findScript(
    token: Token,
    scriptId: ScriptId
  ): Effect<Script<ScriptId>, InvalidTokenError | ScriptNotFoundError> {
    return pipe(
      this.usersService.verifyToken(token),
      flatMap(() => this.scriptRepository.find(scriptId)),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: (err) => fail(ScriptNotFoundError(err.cause)),
      })
    )
  }

  private editScript(
    token: Token,
    scriptId: ScriptId,
    scriptBuilder: ScriptBuilder,
    isAutomation: boolean
  ): Effect<
    Script<ScriptId>,
    | InvalidTokenError
    | PermissionError
    | ScriptNotFoundError
    | UniquenessConstraintViolatedError
    | InvalidScriptError
  > {
    return Do.pipe(
      bind("_", () => this.permissionsService.canEdit(token, scriptId)),
      bind("script", () => scriptBuilder.buildWithId(scriptId)),
      bind("__", ({ script }) =>
        isAutomation
          ? this.checkAutomationActionsPermissions(token, (script as Automation).instructions)
          : succeed(undefined)
      ),
      bind("___", ({ script }) => this.scriptRepository.update(script)),
      map(({ script }) => script),
      mapError((err) => {
        switch (err.__brand) {
          case "NotFoundError":
            return ScriptNotFoundError(err.cause)
        }
        return err
      })
    )
  }

  private removeScript(
    token: Token,
    scriptId: ScriptId
  ): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError, never> {
    return pipe(
      this.permissionsService.canEdit(token, scriptId),
      flatMap(() => this.scriptRepository.remove(scriptId)),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: (err) => fail(ScriptNotFoundError(err.cause)),
      })
    )
  }
}
