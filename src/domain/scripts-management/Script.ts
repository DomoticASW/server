import { Effect, reduce } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { Brand } from "../../utils/Brand.js"
import { ExecutionEnvironment, Instruction } from "./Instruction.js"
import { Trigger } from "./Trigger.js"
import { Token } from "../users-management/Token.js"
import { pipe } from "effect"

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