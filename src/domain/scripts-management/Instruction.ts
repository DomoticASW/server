import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js"
import { Email } from "../users-management/User.js"
import { TaskId } from "./Script.js"
import { Type } from "../../ports/devices-management/Types.js"
import { Effect } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js"
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js"
import { DevicesService } from "../../ports/devices-management/DevicesService.js"
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js"
import { Token } from "../users-management/Token.js"

export interface Instruction {
  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError>
}

export interface SendNotificationInstruction extends Instruction {
  email: Email
  message: string,
  notificationsService: NotificationsService
}

export interface WaitInstruction extends Instruction {
  seconds: number
}

export interface StartTaskInstruction extends Instruction {
  taskId: TaskId,
  scriptsService: ScriptsService,
  permissionsService: PermissionsService
}

export interface DeviceActionInstruction extends Instruction {
  deviceId: DeviceId
  deviceActionId: DeviceActionId
  input: unknown,
  devicesService: DevicesService
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ConstantInstruction<T> extends Instruction {
  name: string
  type: Type
}

export interface CreateConstantInstruction<T> extends ConstantInstruction<T> {
  value: T
}

export interface CreateDevicePropertyConstantInstruction<T> extends ConstantInstruction<T> {
  deviceId: DeviceId
  devicePropertyId: DevicePropertyId,
  devicesService: DevicesService
}

export interface IfInstruction extends Instruction {
  then: Array<Instruction>
  condition: Condition<never>
}

export interface ElseInstruction extends IfInstruction {
  else: Array<Instruction>
}

export interface Condition<T> {
  leftConstant: ConstantInstruction<T>
  rightConstant: ConstantInstruction<T>
  operator: ConditionOperator<T>
  negate: boolean

  evaluate(env: ExecutionEnvironment): boolean
}

export interface ConditionOperator<T> {
  evaluate(left: ConstantValue<T>, right: ConstantValue<T>): boolean;
}

export interface ConstantValue<T> {
  readonly value: T
}

export interface ExecutionEnvironment {
  readonly constants: Map<ConstantInstruction<unknown>, ConstantValue<unknown>>
  readonly taskToken?: Token
}

export function Condition<T>(left: ConstantInstruction<T>, right: ConstantInstruction<T>, operator: ConditionOperator<T>, negate: boolean = false): Condition<T> {
  return {
    leftConstant: left,
    rightConstant: right,
    operator: operator,
    negate: negate,
    evaluate(env) {
      const left = env.constants.get(this.leftConstant) as ConstantValue<T>
      const right = env.constants.get(this.rightConstant) as ConstantValue<T>

      return negate !== operator.evaluate(left, right);
    },
  }
}

export function ConstantValue<T>(value: T): ConstantValue<T> {
  return {
    value: value
  }
}

export function ExecutionEnvironment(token?: Token): ExecutionEnvironment {
  return {
    constants: new Map<ConstantInstruction<unknown>, ConstantValue<unknown>>(),
    taskToken: token
  }
}

export function ExecutionEnvironmentCopy(env: ExecutionEnvironment): ExecutionEnvironment {
  return {
    constants: new Map(env.constants),
    taskToken: env.taskToken
  }
}