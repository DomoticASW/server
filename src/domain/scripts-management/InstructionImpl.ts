import { ExecutionEnvironment, StartTaskInstruction } from "./Instruction.js";
import { TaskId } from "./Script.js";

export function StartTaskInstruction(taskId: TaskId): StartTaskInstruction {
  return {
    taskId: taskId,
    execute(env: ExecutionEnvironment): ExecutionEnvironment {
      return env
    },
  }
}