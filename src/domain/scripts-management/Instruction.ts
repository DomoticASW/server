import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js"
import { Email } from "../users-management/User.js"
import { TaskId } from "./Script.js"
import { Type } from "../../ports/devices-management/Types.js"
import { Effect } from "effect/Effect"
import { ScriptError } from "../../ports/scripts-management/Errors.js"
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js"
import { DevicesService } from "../../ports/devices-management/DevicesService.js"
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js"
import { Token } from "../users-management/Token.js"
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js"

export interface Instruction {
  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError>
}

export interface SendNotificationInstruction extends Instruction {
  email: Email
  message: string
}

export interface WaitInstruction extends Instruction {
  seconds: number
}

export interface StartTaskInstruction extends Instruction {
  taskId: TaskId,
}

export interface DeviceActionInstruction extends Instruction {
  deviceId: DeviceId
  deviceActionId: DeviceActionId
  input: unknown,
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
}

export interface IfInstruction extends Instruction {
  then: Array<Instruction>
  condition: Condition<never>
}

export interface IfElseInstruction extends IfInstruction {
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
  readonly notificationsService: NotificationsService
  readonly scriptsService: ScriptsService
  readonly permissionsService: PermissionsService
  readonly devicesService: DevicesService
  readonly constants: Map<ConstantInstruction<unknown>, ConstantValue<unknown>>
  readonly taskToken?: Token
}

export function Condition<T>(left: ConstantInstruction<T>, right: ConstantInstruction<T>, operator: ConditionOperator<T>, negate: boolean = false): Condition<T> {
  return new ConditionImpl(left, right, operator, negate)
}
class ConditionImpl<T> implements Condition<T> {
  constructor(
    public leftConstant: ConstantInstruction<T>,
    public rightConstant: ConstantInstruction<T>,
    public operator: ConditionOperator<T>,
    public negate: boolean,
  ) { }
  evaluate(env: ExecutionEnvironment): boolean {
    const left = env.constants.get(this.leftConstant) as ConstantValue<T>
    const right = env.constants.get(this.rightConstant) as ConstantValue<T>
    return this.negate !== this.operator.evaluate(left, right);
  }
}

export function ConstantValue<T>(value: T): ConstantValue<T> {
  return {
    value: value
  }
}

export function ExecutionEnvironment(notificationsService: NotificationsService, scriptsService: ScriptsService, permissionsService: PermissionsService, devicesService: DevicesService, token?: Token,): ExecutionEnvironment {
  return {
    notificationsService: notificationsService,
    scriptsService: scriptsService,
    permissionsService: permissionsService,
    devicesService: devicesService,
    constants: new Map<ConstantInstruction<unknown>, ConstantValue<unknown>>(),
    taskToken: token
  }
}

export function ExecutionEnvironmentCopy(env: ExecutionEnvironment): ExecutionEnvironment {
  return {
    notificationsService: env.notificationsService,
    scriptsService: env.scriptsService,
    permissionsService: env.permissionsService,
    devicesService: env.devicesService,
    constants: new Map(env.constants),
    taskToken: env.taskToken
  }
}

// Utils to check structure of instructions

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSendNotificationInstruction(o: any): o is SendNotificationInstruction {
  return o &&
    typeof o === 'object' &&
    'email' in o && typeof o.email === 'string' &&
    'message' in o && typeof o.message === 'string' &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isWaitInstruction(o: any): o is WaitInstruction {
  return o &&
    typeof o === 'object' &&
    'seconds' in o && typeof o.seconds === 'number' &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isStartTaskInstruction(o: any): o is StartTaskInstruction {
  return o &&
    typeof o === 'object' &&
    'taskId' in o && typeof o.taskId === 'string' &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isDeviceActionInstruction(o: any): o is DeviceActionInstruction {
  return o &&
    typeof o === 'object' &&
    'deviceId' in o && typeof o.deviceId === 'string' &&
    'deviceActionId' in o && typeof o.deviceActionId === 'string' &&
    'input' in o &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCreateConstantInstruction<T>(o: any): o is CreateConstantInstruction<T> {
  return o &&
    typeof o === 'object' &&
    'name' in o && typeof o.name === 'string' &&
    'type' in o && typeof o.type === 'string' &&
    'value' in o &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCreateDevicePropertyConstantInstruction<T>(o: any): o is CreateDevicePropertyConstantInstruction<T> {
  return o &&
    typeof o === 'object' &&
    'name' in o && typeof o.name === 'string' &&
    'type' in o && typeof o.type === 'string' &&
    'deviceId' in o && typeof o.deviceId === 'string' &&
    'devicePropertyId' in o && typeof o.devicePropertyId === 'string' &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIfInstruction(o: any): o is IfInstruction {
  return o &&
    typeof o === 'object' &&
    'then' in o && Array.isArray(o.then) &&
    'condition' in o && typeof o.condition === 'object' &&
    typeof o.execute === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIfElseInstruction(o: any): o is IfElseInstruction {
  return isIfInstruction(o) &&
    'else' in o && Array.isArray(o.else);
}
