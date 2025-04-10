// import { CreateConstantInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { AutomationId, Task, TaskId } from "../../../src/domain/scripts-management/Script.js"
// import { Type } from "../../../src/ports/devices-management/Types.js"

test("A taskId can be created", () => {
  const taskId = TaskId("1")
  expect(taskId).toBe("1")
})

test("An automationId can be created", () => {
  const automationId = AutomationId("1")
  expect(automationId).toBe("1")
})

test("A task can be created", () => {
  const taskId = TaskId("1")
  const task = Task(taskId, "taskName", [])

  expect(task.id).toBe(taskId)
  expect(task.name).toBe("taskName")
})

// How to test execution of a task without a spy?
// test("A task can be executed", () => {
//   const taskId = TaskId("1")
//   const instruction1 = CreateConstantInstruction("constantName1", Type.IntType, 15)
//   const instruction2 = CreateConstantInstruction("constantName2", Type.IntType, 25)
//   const instructions = [
//     instruction1,
//     instruction2
//   ]

//   const task = Task(taskId, "taskName", instructions)
//   task.execute()
// })
