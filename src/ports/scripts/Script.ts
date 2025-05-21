import { Brand } from "../../utils/Brand.js"
import { Instruction } from "../../domain/scripts-management/Instruction.js"
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
