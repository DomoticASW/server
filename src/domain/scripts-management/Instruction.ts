import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js"
import { Email } from "../users-management/User.js"
import { TaskId } from "./Script.js"
import { Type } from "../../ports/devices-management/Types.js"

export interface Instruction {
  execute(env: ExecutionEnvironment): ExecutionEnvironment
}

export interface SendNotificationInstruction extends Instruction {
  email: Email
  message: string
}

export interface WaitInstruction extends Instruction {
  seconds: number
}

export interface StartTaskInstruction extends Instruction {
  taskId: TaskId
}

export interface DeviceActionInstruction extends Instruction {
  deviceId: DeviceId
  deviceActionId: DeviceActionId
  input: unknown
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
  devicePropertyId: DevicePropertyId
}

export interface IfInstruction extends Instruction {
  then: Instruction
  condition: Condition<never>
}

export interface ElseInstruction extends IfInstruction {
  else: Instruction
}

export interface Condition<T> {
  leftConstant: ConstantInstruction<T>
  rightConstant: ConstantInstruction<T>
  operator: ConditionOperator<T>
  negate: boolean

  evaluate(env: ExecutionEnvironment): boolean
}

export interface ConditionOperator<T> {
  evaluate(left: ConstantInstruction<T>, right: ConstantInstruction<T>): boolean;
}

export interface ConstantValue<T> {
  readonly value: T
}

export interface ExecutionEnvironment {
  readonly constants: Map<ConstantInstruction<unknown>, ConstantValue<unknown>>
}

export function ConstantValue<T>(value: T): ConstantValue<T> {
  return {
    value: value
  }
}

export function ExecutionEnvironment(): ExecutionEnvironment {
  return {
    constants: new Map<ConstantInstruction<unknown>, ConstantValue<unknown>>()
  }
}

export function ExecutionEnvironmentFromConstants(constants: Map<ConstantInstruction<unknown>, ConstantValue<unknown>>): ExecutionEnvironment {
  return {
    constants: new Map(constants)
  }
}