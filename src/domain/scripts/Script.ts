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
export function ScriptId(id: string, type: "Task" | "Automation"): TaskId | AutomationId {
  if (type == "Task") {
    return TaskId(id)
  } else if (type == "Automation") {
    return AutomationId(id)
  }

  // It is wrong, but I need impl for doing tests
  return TaskId(id)
}
