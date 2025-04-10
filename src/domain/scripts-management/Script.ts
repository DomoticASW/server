import { Brand } from "../../utils/Brand.js"
import { Instruction } from "./Instruction.js"
import { Trigger } from "./Trigger.js"

export interface Script<Id extends ScriptId> {
  readonly id: Id
  name: string

  instructions: Array<Instruction>

  execute(): void
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
    execute() {
      // How can this be tested without a spy?
      // let env = ExecutionEnvironment()

      // this.instructions.forEach(instruction =>
      //   env = instruction.execute(env)
      // )
    },
  }
}