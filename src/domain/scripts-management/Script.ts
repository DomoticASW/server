import { andThen, Effect, flatMap, reduce, runFork, sleep, succeed, sync } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { Brand } from "../../utils/Brand.js"
import { ExecutionEnvironment, Instruction } from "./Instruction.js"
import { PeriodTrigger, PeriodTriggerImpl, Trigger } from "./Trigger.js"
import { Token } from "../users-management/Token.js"
import { pipe } from "effect"
import { millis, seconds } from "effect/Duration"

export interface Script<Id extends ScriptId> {
  readonly id: Id
  name: string

  instructions: Array<Instruction>

  execute(token?: Token): Effect<ExecutionEnvironment, ScriptError>
}

export type Task = Script<TaskId>

export interface Automation extends Script<AutomationId> {
  enabled: boolean
  trigger: Trigger
}

export type ScriptId = TaskId | AutomationId

export type TaskId = Brand<string, "TaskId">
export type AutomationId = Brand<string, "AutomationId">

export function TaskId(id: string): TaskId { return id as TaskId }
export function AutomationId(id: string): AutomationId { return id as AutomationId }

export function Task(id: TaskId, name: string, instructions: Array<Instruction>): Task {
  return {
    id: id,
    name: name,
    instructions: instructions,
    execute(token) {
      return pipe(
        reduce(this.instructions, ExecutionEnvironment(token), (env, instr) => instr.execute(env))
      )
    },
  }
}

class AutomationImpl implements Automation {
  enabled: boolean
  trigger: Trigger
  id: AutomationId
  name: string
  instructions: Instruction[]

  constructor(id: AutomationId, name: string, trigger: Trigger, instructions: Array<Instruction>) {
    this.id = id
    this.name = name
    this.trigger = trigger
    this.instructions = instructions
    this.enabled = true

    runFork(this.checkTrigger())
  }
  
  private checkTrigger(): Effect<undefined, ScriptError> {
    if (this.trigger instanceof PeriodTriggerImpl) {
      const periodTrigger = this.trigger as PeriodTrigger
      return pipe(
        this.waitToStart(periodTrigger),
        andThen(() => this.loop(periodTrigger))
      )
    }

    return fail(ScriptError())
  }

  private waitToStart(periodTrigger: PeriodTrigger): Effect<void, never, never> {
    const delay = periodTrigger.start.getMilliseconds() - new Date().getMilliseconds()
    return delay > 0 ? sleep(millis(delay)) : succeed(null)
  }

  private loop(periodTrigger: PeriodTrigger): Effect<undefined, ScriptError> {
    return pipe(
      sync(() => this.enabled),
      flatMap(enabled => 
        enabled
          ? pipe(
            this.execute(),
            andThen(() => sleep(seconds(periodTrigger.periodSeconds))),
            andThen(() => this.loop(periodTrigger))
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