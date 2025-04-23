import { Duration, pipe } from "effect";
import { Type } from "../../ports/devices-management/Types.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { Condition, ConstantValue, CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, ElseInstruction, ExecutionEnvironmentFromConstants, IfInstruction, Instruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";
import { andThen, map, mapError, sleep, succeed, orDie, flatMap, sync, reduce, fail, fromNullable } from "effect/Effect";
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { InvalidConstantType, ScriptError } from "../../ports/scripts-management/Errors.js";
import { Color } from "../devices-management/Types.js";
import { DevicePropertyNotFound } from "../../ports/devices-management/Errors.js";

export function SendNotificationInstruction(email: Email, message: string, notificationsService: NotificationsService): SendNotificationInstruction {
  return {
    email: email,
    message: message,
    notificationsService: notificationsService,
    execute(env) {
      return pipe(
        notificationsService.sendNotification(email, message),
        map(() => env),
        mapError(error => ScriptError(error.message + ", " + error.cause))
      )
    },
  }
}

export function WaitInstruction(seconds: number): WaitInstruction {
  return {
    seconds: seconds,
    execute(env) {
      return pipe(
        sleep(Duration.seconds(seconds)),
        andThen(() => succeed(env)),
        orDie
      )
    },
  }
}

export function StartTaskInstruction(taskId: TaskId, scriptsService: ScriptsService): StartTaskInstruction {
  return {
    taskId: taskId,
    scriptsService: scriptsService,
    execute(env) {
      return pipe(
        scriptsService.findTaskUnsafe(taskId),
        flatMap(task =>
          pipe(
            task.execute(),
            andThen(() => succeed(env))
          )
        ),
        mapError(error => ScriptError(error.message + ", " + error.cause))
      )
    },
  }
}

export function DeviceActionInstruction(deviceId: DeviceId, deviceActionId: DeviceActionId, input: unknown, devicesService: DevicesService): DeviceActionInstruction {
  return {
    deviceId: deviceId,
    deviceActionId: deviceActionId,
    input: input,
    devicesService: devicesService,
    execute(env) {
      return pipe(
        devicesService.executeAutomationAction(deviceId, deviceActionId, input),
        map(() => env),
        mapError(error => ScriptError(error.message + ", " + error.cause))
      )
    },
  }
}

function isColor(value: unknown): value is Color {
  return (
    typeof value === "object" &&
    value !== null &&
    "r" in value &&
    "g" in value &&
    "b" in value &&
    typeof (value as { r: unknown }).r === "number" &&
    typeof (value as { g: unknown }).g === "number" &&
    typeof (value as { b: unknown }).b === "number"
  );
}

export function CreateConstantInstruction<T>(name: string, type: Type, value: T): CreateConstantInstruction<T> {
  return {
    name: name,
    type: type,
    value: value,
    execute(env) {
      return pipe(
        sync(() => {
          return (() => {
            switch (this.type) {
              case "IntType":
              case "DoubleType":
                return typeof value === "number"
              case "BooleanType":
                return typeof value === "boolean"
              case "ColorType":
                return isColor(value)
              case "StringType":
                return typeof value === "string"
              case "VoidType":
                return typeof value === "undefined"
              default:
                return false
            }
          })()
        }),
        flatMap(isValid =>
          isValid
          ? succeed(ExecutionEnvironmentFromConstants(env.constants))
          : fail(InvalidConstantType(type))
        ),
        flatMap(newEnv => {
          {
            newEnv.constants.set(this, ConstantValue(value))
            return succeed(newEnv)
          }
        }),
        mapError(error => ScriptError(error.message + ": " + error.cause))
      )
    }
  }
}

export function CreateDevicePropertyConstantInstruction<T>(name: string, type: Type, deviceId: DeviceId, devicePropertyId: DevicePropertyId, devicesService: DevicesService): CreateDevicePropertyConstantInstruction<T> {
  return {
    name: name,
    type: type,
    deviceId: deviceId,
    devicePropertyId: devicePropertyId,
    devicesService: devicesService,
    execute(env) {
      return pipe(
        devicesService.findUnsafe(deviceId),
        flatMap(device => {
          const property = device.properties.find(property => property.id === devicePropertyId)
          return pipe(
            property,
            fromNullable,
            mapError(() => DevicePropertyNotFound(`Property ${devicePropertyId} not found in device ${device.id}`)),
            flatMap((prop) =>
              type !== prop.typeConstraints.type
                ? fail(InvalidConstantType(`${type} is not ${prop.typeConstraints.type}`))
                : succeed(prop)
            ),
            map((prop) => {
              const newEnv = ExecutionEnvironmentFromConstants(env.constants)
              newEnv.constants.set(this, ConstantValue(prop.value))
              return newEnv
            })
          )
        }),
        mapError(error => ScriptError(error.message + ", " + error.cause)),
      )
    }
  }
}

export function IfInstruction(instructions: Array<Instruction>, condition: Condition<never>): IfInstruction {
  return {
    then: instructions,
    condition: condition,
    execute(env) {
      const newEnv = ExecutionEnvironmentFromConstants(env.constants)
      return pipe(
        sync(() => condition.evaluate(newEnv)),
        flatMap((shouldRun) =>
          shouldRun
            ? reduce(this.then, newEnv, (env, instr) => instr.execute(env))
            : succeed(newEnv)
        )
      )
    },
  }
}

export function ElseInstruction(thenInstructions: Array<Instruction>, elseInstructions: Array<Instruction>, condition: Condition<never>): ElseInstruction {
  return {
    then: thenInstructions,
    else: elseInstructions,
    condition: condition,
    execute(env) {
      const newEnv = ExecutionEnvironmentFromConstants(env.constants)
      return pipe(
        sync(() => condition.evaluate(newEnv)),
        flatMap((shouldRun) =>
          shouldRun
            ? reduce(this.then, newEnv, (env, instr) => instr.execute(env))
            : reduce(this.else, newEnv, (env, instr) => instr.execute(env))
        )
      )
    },
  }
}