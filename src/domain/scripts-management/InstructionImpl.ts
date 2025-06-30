import { Duration, pipe } from "effect";
import { Type } from "../../ports/devices-management/Types.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { Condition, ConstantValue, CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfElseInstruction, ExecutionEnvironment, ExecutionEnvironmentCopy, IfInstruction, Instruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";
import { andThen, map, mapError, sleep, succeed, orDie, flatMap, sync, reduce, fail, fromNullable, Effect, void as voidEffect } from "effect/Effect";
import { InvalidConstantTypeError, ScriptError } from "../../ports/scripts-management/Errors.js";
import { isColor } from "../devices-management/Types.js";
import { DevicePropertyNotFound } from "../../ports/devices-management/Errors.js";

export function SendNotificationInstruction(email: Email, message: string): SendNotificationInstruction {
  return new SendNotificationInstructionImpl(email, message)
}
class SendNotificationInstructionImpl implements SendNotificationInstruction {
  constructor(
    public email: Email,
    public message: string
  ) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      env.notificationsService.sendNotification(this.email, this.message),
      map(() => env),
      mapError(error => ScriptError(error.message + ", " + error.cause))
    )
  }
}

export function WaitInstruction(seconds: number): WaitInstruction {
  return new WaitInstructionImpl(seconds)
}
class WaitInstructionImpl implements WaitInstruction {
  constructor(public seconds: number) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      sleep(Duration.seconds(this.seconds)),
      andThen(() => succeed(env)),
      orDie
    )
  }
}

export function StartTaskInstruction(taskId: TaskId): StartTaskInstruction {
  return new StartTaskInstructionImpl(taskId)
}
class StartTaskInstructionImpl implements StartTaskInstruction {
  constructor(public taskId: TaskId) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      env.taskToken
        ? env.permissionsService.canExecuteTask(env.taskToken, this.taskId)
        : voidEffect,
      flatMap(() =>
        pipe(
          env.scriptsService.findTaskUnsafe(this.taskId),
          flatMap(task =>
            pipe(
              task.execute(
                env.notificationsService,
                env.scriptsService,
                env.permissionsService,
                env.devicesService,
                env.deviceActionsService,
                env.taskToken
              ),
              andThen(() => succeed(env))
            )
          )
        )
      ),
      mapError(error => ScriptError(error.message + ", " + error.cause))
    )
  }
}

export function DeviceActionInstruction(
  deviceId: DeviceId,
  deviceActionId: DeviceActionId,
  input: unknown
): DeviceActionInstruction {
  return new DeviceActionInstructionImpl(deviceId, deviceActionId, input)
}
class DeviceActionInstructionImpl implements DeviceActionInstruction {
  constructor(
    public deviceId: DeviceId,
    public deviceActionId: DeviceActionId,
    public input: unknown
  ) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      env.deviceActionsService.executeAutomationAction(this.deviceId, this.deviceActionId, this.input),
      map(() => env),
      mapError(error => ScriptError(error.message + ", " + error.cause))
    )
  }
}

export function CreateConstantInstruction<T>(
  name: string,
  type: Type,
  value: T
): CreateConstantInstruction<T> {
  return new CreateConstantInstructionImpl(name, type, value)
}
class CreateConstantInstructionImpl<T> implements CreateConstantInstruction<T> {
  constructor(
    public name: string,
    public type: Type,
    public value: T
  ) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      sync(() => {
        switch (this.type) {
          case "IntType":
          case "DoubleType":
            return typeof this.value === "number"
          case "BooleanType":
            return typeof this.value === "boolean"
          case "ColorType":
            return isColor(this.value)
          case "StringType":
            return typeof this.value === "string"
          case "VoidType":
            return typeof this.value === "undefined"
        }
      }),
      flatMap(isValid =>
        isValid
          ? succeed(ExecutionEnvironmentCopy(env))
          : fail(InvalidConstantTypeError(this.type))
      ),
      flatMap(newEnv => {
        newEnv.constants.set(this, ConstantValue(this.value))
        return succeed(newEnv)
      }),
      mapError(error => ScriptError(error.message + ": " + error.cause))
    )
  }
}

export function CreateDevicePropertyConstantInstruction<T>(
  name: string,
  type: Type,
  deviceId: DeviceId,
  devicePropertyId: DevicePropertyId
): CreateDevicePropertyConstantInstruction<T> {
  return new CreateDevicePropertyConstantInstructionImpl(name, type, deviceId, devicePropertyId)
}
class CreateDevicePropertyConstantInstructionImpl<T> implements CreateDevicePropertyConstantInstruction<T> {
  constructor(
    public name: string,
    public type: Type,
    public deviceId: DeviceId,
    public devicePropertyId: DevicePropertyId
  ) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    return pipe(
      env.devicesService.findUnsafe(this.deviceId),
      flatMap(device => {
        const property = device.properties.find(p => p.id === this.devicePropertyId)
        return pipe(
          property,
          fromNullable,
          mapError(() =>
            DevicePropertyNotFound(`Property ${this.devicePropertyId} not found in device ${device.id}`)
          ),
          flatMap(prop =>
            this.type !== prop.typeConstraints.type
              ? fail(InvalidConstantTypeError(`${this.type} is not ${prop.typeConstraints.type}`))
              : succeed(prop)
          ),
          map(prop => {
            const newEnv = ExecutionEnvironmentCopy(env)
            newEnv.constants.set(this, ConstantValue(prop.value))
            return newEnv
          })
        )
      }),
      mapError(error => ScriptError(error.message + ", " + error.cause))
    )
  }
}

export function IfInstruction(instructions: Array<Instruction>, condition: Condition<never>): IfInstruction {
  return new IfInstructionImpl(instructions, condition)
}
class IfInstructionImpl implements IfInstruction {
  constructor(
    public then: Array<Instruction>,
    public condition: Condition<never>
  ) { }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    const newEnv = ExecutionEnvironmentCopy(env)
    return pipe(
      sync(() => this.condition.evaluate(newEnv)),
      flatMap(shouldRun =>
        shouldRun
          ? reduce(this.then, newEnv, (env, instr) => instr.execute(env))
          : succeed(newEnv)
      )
    )
  }
}

export function IfElseInstruction(
  thenInstructions: Array<Instruction>,
  elseInstructions: Array<Instruction>,
  condition: Condition<never>
): IfElseInstruction {
  return new IfElseInstructionImpl(thenInstructions, elseInstructions, condition)
}
class IfElseInstructionImpl implements IfElseInstruction {
  then: Array<Instruction>
  else: Array<Instruction>
  condition: Condition<never>

  constructor(
    then: Array<Instruction>,
    else_: Array<Instruction>,
    condition: Condition<never>
  ) {
    this.then = then
    this.else = else_
    this.condition = condition
  }

  execute(env: ExecutionEnvironment): Effect<ExecutionEnvironment, ScriptError> {
    const newEnv = ExecutionEnvironmentCopy(env)
    return pipe(
      sync(() => this.condition.evaluate(newEnv)),
      flatMap(shouldRun =>
        shouldRun
          ? reduce(this.then, newEnv, (env, instr) => instr.execute(env))
          : reduce(this.else, newEnv, (env, instr) => instr.execute(env))
      )
    )
  }
}
