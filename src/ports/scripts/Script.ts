import { Instruction } from "./Instruction.js"
import { Trigger } from "./Trigger.js"

export interface Script<Id extends ScriptId> {
  id: Id
  name: string

  instructions: Array<Instruction>

  execute(): void
}

export type Task = Script<TaskId>

export interface Automation extends Script<AutomationId> {
  enabled: boolean
  trigger: Trigger
}

export type ScriptId = string

type TaskId = ScriptId
type AutomationId = ScriptId
