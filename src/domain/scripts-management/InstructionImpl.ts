import { pipe } from "effect";
import { Type } from "../../ports/devices-management/Types.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { Condition, ConstantValue, CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, ElseInstruction, ExecutionEnvironmentFromConstants, IfInstruction, Instruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";
import { runPromise, tryPromise } from "effect/Effect";
import { orDie } from "effect/Effect";

export function SendNotificationInstruction(email: Email, message: string): SendNotificationInstruction {
  return {
    email: email,
    message: message,
    execute(env) {
      //TODO: Send the notification via the notification service
      return pipe(
        tryPromise(async () => env),
        orDie
      )
    },
  }
}

export function WaitInstruction(seconds: number): WaitInstruction {
  return {
    seconds: seconds,
    execute(env) {
      //TODO: Wait the seconds to procede
      return pipe(
        tryPromise(async () => env),
        orDie
      )
    },
  }
}

export function StartTaskInstruction(taskId: TaskId): StartTaskInstruction {
  return {
    taskId: taskId,
    execute(env) {
      //TODO: Execute the task, need of the scripts service to be implemented
      return pipe(
        tryPromise(async () => env),
        orDie
      )
    },
  }
}

export function DeviceActionInstruction(deviceId: DeviceId, deviceActionId: DeviceActionId, input: unknown): DeviceActionInstruction {
  return {
    deviceId: deviceId,
    deviceActionId: deviceActionId,
    input: input,
    execute(env) {
      //TODO: Execute the action on the device via the devices service
      return pipe(
        tryPromise(async () => env),
        orDie
      )
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

export function CreateDevicePropertyConstantInstruction<T>(name: string, type: Type, deviceId: DeviceId, devicePropertyId: DevicePropertyId): CreateDevicePropertyConstantInstruction<T> {
  return {
    name: name,
    type: type,
    deviceId: deviceId,
    devicePropertyId: devicePropertyId,
    execute(env) {
      //TODO: Get the value of the property from the device via the device service and add it to the env constants
      return pipe(
        tryPromise(async () => env),
        orDie
      )
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