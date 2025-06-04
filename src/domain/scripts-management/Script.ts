import { Effect, reduce } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { Brand } from "../../utils/Brand.js"
import { ExecutionEnvironment, Instruction } from "./Instruction.js"
import { Token } from "../users-management/Token.js"
import { DevicesService } from "../../ports/devices-management/DevicesService.js"
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js"
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js"
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js"
import { Trigger } from "./Trigger.js"

export interface Script<Id extends ScriptId> {
  readonly id: Id
  name: string

  instructions: Array<Instruction>

  execute(notificationsService: NotificationsService, scriptsService: ScriptsService, permissionsService: PermissionsService, devicesService: DevicesService, token?: Token): Effect<ExecutionEnvironment, ScriptError>
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
  return new TaskImpl(id, name, instructions)
}

export class TaskImpl implements Task {
  id: TaskId
  name: string
  instructions: Array<Instruction>

  constructor(id: TaskId, name: string, instructions: Array<Instruction>) {
    this.id = id
    this.name = name
    this.instructions = instructions
  }

  execute(notificationsService: NotificationsService, scriptsService: ScriptsService, permissionsService: PermissionsService, devicesService: DevicesService, token?: Token): Effect<ExecutionEnvironment, ScriptError> {
    return reduce(this.instructions, ExecutionEnvironment(notificationsService, scriptsService, permissionsService, devicesService, token), (env, instr) => instr.execute(env))
  }
}

export class AutomationImpl implements Automation {
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
  }

  execute(notificationsService: NotificationsService, scriptsService: ScriptsService, permissionsService: PermissionsService, devicesService: DevicesService): Effect<ExecutionEnvironment, ScriptError> {
    return reduce(this.instructions, ExecutionEnvironment(notificationsService, scriptsService, permissionsService, devicesService), (env, instr) => instr.execute(env))
  }
}

export function Automation(id: AutomationId, name: string, trigger: Trigger, instructions: Array<Instruction>): Automation {
  return new AutomationImpl(id, name, trigger, instructions)
}