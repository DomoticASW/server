import { Duration, pipe } from "effect";
import { Type } from "../../ports/devices-management/Types.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { Condition, ConstantValue, CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, ElseInstruction, ExecutionEnvironmentFromConstants, IfInstruction, Instruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";
import { andThen, map, mapError, runPromise, sleep, succeed, tryPromise, orDie, flatMap } from "effect/Effect";
import { ScriptsService } from "../../ports/scripts-management/ScriptsService.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { ScriptError } from "../../ports/scripts-management/Errors.js";

export function SendNotificationInstruction(email: Email, message: string, notificationsService: NotificationsService): SendNotificationInstruction {
  return {
    email: email,
    message: message,
    notificationsService: notificationsService,
    execute(env) {
      return pipe(
        notificationsService.sendNotification(email, message),
        map(() => env),
        mapError(error => ScriptError(error.message))
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
        orDie
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
      //TODO: Execute the action on the device via the devices service
      return succeed(env)
    },
  }
}

export function CreateConstantInstruction<T>(name: string, type: Type, value: T): CreateConstantInstruction<T> {
  return {
    name: name,
    type: type,
    value: value,
    execute(env) {
      return pipe(
        tryPromise(async () => {
          const newEnv = ExecutionEnvironmentFromConstants(env.constants)
          newEnv.constants.set(this, ConstantValue(value))
          return newEnv
        }),
        orDie
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
      //TODO: Get the value of the property from the device via the device service and add it to the env constants
      return succeed(env)
    }
  }
}

export function IfInstruction(instructions: Array<Instruction>, condition: Condition<never>): IfInstruction {
  return {
    then: instructions,
    condition: condition,
    execute(env) {
      return pipe(
        tryPromise(async () => {
          let newEnv = ExecutionEnvironmentFromConstants(env.constants)

          if (condition.evaluate(newEnv)) {
            for(const instruction of this.then) {
              newEnv = await runPromise(instruction.execute(newEnv))
            }
          }

          return newEnv
        }),
        orDie
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
      return pipe(
        tryPromise(async () => {
          let newEnv = ExecutionEnvironmentFromConstants(env.constants)
          const instructions = condition.evaluate(newEnv) ? this.then : this.else

          for(const instruction of instructions) {
            newEnv = await runPromise(instruction.execute(newEnv))
          }

          return newEnv
        }),
        orDie
      )
    },
  }
}