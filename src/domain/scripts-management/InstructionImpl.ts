import { Type } from "../../ports/devices-management/Types.js";
import { CreateConstantInstruction, ExecutionEnvironment, StartTaskInstruction } from "./Instruction.js";
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
      return env
    }
  }
}