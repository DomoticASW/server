import { StartTaskInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"

test("A start task instruction can be created", () => {
  const instruction = StartTaskInstruction(TaskId("1"))
  expect(instruction.taskId).toBe("1")
})