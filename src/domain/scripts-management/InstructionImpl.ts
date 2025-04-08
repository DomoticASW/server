import { Type } from "../../ports/devices-management/Types.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { ConstantValue, CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, ExecutionEnvironmentFromConstants, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";

export function SendNotificationInstruction(email: Email, message: string): SendNotificationInstruction {
  return {
    email: email,
    message: message,
    execute(env) {
      //TODO: Send the notification via the notification service
      return env
    },
  }
}

export function WaitInstruction(seconds: number): WaitInstruction {
  return {
    seconds: seconds,
    execute(env) {
      //TODO: Wait the seconds to procede
      return env
    },
  }
}

export function StartTaskInstruction(taskId: TaskId): StartTaskInstruction {
  return {
    taskId: taskId,
    execute(env) {
      //TODO: Execute the task, need of the scripts service to be implemented
      return env
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
      return env
    },
  }
}

export function CreateConstantInstruction<T>(name: string, type: Type, value: T): CreateConstantInstruction<T> {
  return {
    name: name,
    type: type,
    value: value,
    execute(env) {
      const newEnv = ExecutionEnvironmentFromConstants(env.constants)
      newEnv.constants.set(this, ConstantValue(value))
      return newEnv
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
      return env
    }
  }
}