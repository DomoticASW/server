import { Type } from "../../ports/devices-management/Types.js";
import { Email } from "../users-management/User.js";
import { ConstantValue, CreateConstantInstruction, ExecutionEnvironmentFromConstants, SendNotificationInstruction, StartTaskInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";

export function SendNotificationInstruction(email: Email, message: string): SendNotificationInstruction {
  return {
    email: email,
    message: message,
    execute(env) {
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