import { CreateConstantInstruction, StartTaskInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

test("A start task instruction can be created", () => {
  const instruction = StartTaskInstruction(TaskId("1"))
  expect(instruction.taskId).toBe("1")
})

test("A create constant instruction can be created", () => {
  const instruction = CreateConstantInstruction("constantName", Type.IntType, 10)
  expect(instruction.name).toBe("constantName");
  expect(instruction.type).toBe(Type.IntType);
  expect(instruction.value).toBe(10);
})