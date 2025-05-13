import { andThen, Effect, flatMap, reduce, runFork, sleep, succeed, sync } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { Brand } from "../../utils/Brand.js"
import { ExecutionEnvironment, Instruction } from "./Instruction.js"
import { DeviceEventTrigger, DeviceEventTriggerImpl, PeriodTrigger, PeriodTriggerImpl, Trigger } from "./Trigger.js"
import { Token } from "../users-management/Token.js"
import { pipe } from "effect"
import { millis, seconds } from "effect/Duration"
import { DeviceEventsSubscriber } from "../../ports/devices-management/DeviceEventsService.js"
import { DeviceId, DeviceEvent } from "../devices-management/Device.js"

export interface Script<Id extends ScriptId> {
  readonly id: Id
  name: string

  instructions: Array<Instruction>

  execute(token?: Token): Effect<ExecutionEnvironment, ScriptError>
}

export type Task = Script<TaskId>

export interface Automation extends Script<AutomationId>, DeviceEventsSubscriber {
  readonly enabled: boolean
  trigger: Trigger
  enable(): void
  disable(): void
}

export type ScriptId = TaskId | AutomationId

export type TaskId = Brand<string, "TaskId">
export type AutomationId = Brand<string, "AutomationId">

export function TaskId(id: string): TaskId { return id as TaskId }
export function AutomationId(id: string): AutomationId { return id as AutomationId }

export function Task(id: TaskId, name: string, instructions: Array<Instruction>): Task {
  return new TaskImpl(id, name, instructions)
}

class TaskImpl implements Task {
  id: TaskId
  name: string
  instructions: Array<Instruction>

  constructor(id: TaskId, name: string, instructions: Array<Instruction>) {
    this.id = id
    this.name = name
    this.instructions = instructions
  }

  execute(token?: Token): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      reduce(this.instructions, ExecutionEnvironment(token), (env, instr) => instr.execute(env))
    )
  }
}

class AutomationImpl implements Automation {
  enabled: boolean = false
  trigger: Trigger
  id: AutomationId
  name: string
  instructions: Instruction[]

  constructor(id: AutomationId, name: string, trigger: Trigger, instructions: Array<Instruction>) {
    this.id = id
    this.name = name
    this.trigger = trigger
    this.instructions = instructions
  }

  deviceEventPublished(deviceId: DeviceId, event: DeviceEvent): void {
    if (this.trigger instanceof DeviceEventTriggerImpl && this.enabled) {
      const deviceEventTrigger = this.trigger as DeviceEventTrigger

      if (deviceId == deviceEventTrigger.deviceId && event.name == deviceEventTrigger.eventName) {
        runFork(this.execute())
      }
    }
  }

  enable(): void {
    if (!this.enabled) {
      this.enabled = true
      if (this.trigger instanceof PeriodTriggerImpl) {
        runFork(this.checkTrigger())
      }
    }
  }

  disable(): void {
    this.enabled = false
  }

  private checkTrigger(): Effect<undefined, ScriptError> {
    const periodTrigger = this.trigger as PeriodTrigger
    return pipe(
      this.waitToStart(periodTrigger),
      andThen(() => this.periodLoop(periodTrigger))
    )
  }

  private waitToStart(periodTrigger: PeriodTrigger): Effect<void, never, never> {
    const delay = periodTrigger.start.getMilliseconds() - new Date().getMilliseconds()
    return delay > 0 ? sleep(millis(delay)) : succeed(null)
  }

  private periodLoop(periodTrigger: PeriodTrigger): Effect<undefined, ScriptError> {
    return pipe(
      sync(() => this.enabled),
      flatMap(enabled =>
        enabled
          ? pipe(
            this.execute(),
            andThen(() => sleep(seconds(periodTrigger.periodSeconds))),
            andThen(() => this.periodLoop(periodTrigger))
          )
          : succeed(undefined)
      )
    )
  }

  execute(): Effect<ExecutionEnvironment, ScriptError> {
    return reduce(this.instructions, ExecutionEnvironment(), (env, instr) => instr.execute(env))
  }
}

export function Automation(id: AutomationId, name: string, trigger: Trigger, instructions: Array<Instruction>): Automation {
  return new AutomationImpl(id, name, trigger, instructions)
}