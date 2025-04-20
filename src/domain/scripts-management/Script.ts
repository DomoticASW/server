import { Effect } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { Brand } from "../../utils/Brand.js"
import { ExecutionEnvironment, Instruction } from "./Instruction.js"
import { Trigger } from "./Trigger.js"

export interface Script<Id extends ScriptId> {
  readonly id: Id
  name: string

  instructions: Array<Instruction>

  execute(): Effect<ExecutionEnvironment, ScriptError>
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

// export function Task(id: TaskId, name: string, instructions: Array<Instruction>): Task {
//   return {
//     id: id,
//     name: name,
//     instructions: instructions,
//     execute() {
//       // let env = ExecutionEnvironment()

//       // this.instructions.forEach(instruction =>
//       //   env = instruction.execute(env)
//       // )
//     },
//   }
// }