import { Type } from "../../ports/devices-management/Types.js";
import { ConstantValue, CreateConstantInstruction, ExecutionEnvironment, ExecutionEnvironmentFromConstants, StartTaskInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";

export function StartTaskInstruction(taskId: TaskId): StartTaskInstruction {
  return {
    taskId: taskId,
    execute(env: ExecutionEnvironment): ExecutionEnvironment {
      //Execute the task, need of the scripts service to be implemented
      return env
    },
  }
}

export function CreateConstantInstruction<T>(name: string, type: Type, value: T): CreateConstantInstruction<T> {
  return {
    name: name,
    type: type,
    value: value,
    execute(env: ExecutionEnvironment): ExecutionEnvironment {
      const newEnv = ExecutionEnvironmentFromConstants(env.constants)
      newEnv.constants.set(this, ConstantValue(value))
      return newEnv
    }
  }
}