import { match, runPromise } from "effect/Effect"
import { CreateConstantInstruction, StartTaskInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { Automation, AutomationId, Task, TaskId } from "../../../src/domain/scripts-management/Script.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { ScriptError, ScriptNotFoundError } from "../../../src/ports/scripts-management/Errors.js"
import { PermissionsServiceSpy, ScriptsServiceSpy, SpyTaskMock, TokenMock } from "./mocks.js"
import { pipe } from "effect"
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js"
import { PeriodTrigger } from "../../../src/domain/scripts-management/Trigger.js"

test("A script error can be created", () => {
  const error = ScriptError("this is the cause")
  expect(error.message).toBe("There was an error in the script execution")
  expect(error.cause).toBe("this is the cause")
  expect(error.__brand).toBe("ScriptError")
})

test("A script not found error can be created", () => {
  const error = ScriptNotFoundError("this is the cause")
  expect(error.message).toBe("The script has not been found")
  expect(error.cause).toBe("this is the cause")
  expect(error.__brand).toBe("ScriptNotFoundError")
})

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

test("A task can be executed", async () => {
  const taskId = TaskId("1")
  const instruction1 = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const instruction2 = CreateConstantInstruction("constantName2", Type.IntType, 25)
  const instructions = [
    instruction1,
    instruction2
  ]

  const task = Task(taskId, "taskName", instructions)
  const env = await runPromise(task.execute(TokenMock("email")))

  expect(env.constants.get(instruction1)).toBeDefined()
  expect(env.constants.get(instruction2)).toBeDefined()
})

test("A task cannot execute another task id token has not the permissions", async () => {
  const spyTask = SpyTaskMock().get()
  const scriptsService = ScriptsServiceSpy(spyTask, true).get()
  const requiredToken = TokenMock("email")
  const permissionsService = PermissionsServiceSpy(requiredToken).get()
  
  const startTaskInstruction = StartTaskInstruction(spyTask.id, scriptsService, permissionsService)
  
  const taskId = TaskId("1")
  const task = Task(taskId, "taskName", [startTaskInstruction])
  
  await pipe(
    task.execute(TokenMock("otherEmail")),
    match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(PermissionError().message + ", " + PermissionError().cause)
      }
    }),
    runPromise
  )
})

test("A task can be started by another task if the token has the permissions", async () => {
  const spyTask = SpyTaskMock()
  const scriptsService = ScriptsServiceSpy(spyTask.get(), true).get()
  const requiredToken = TokenMock("email")
  const permissionsService = PermissionsServiceSpy(requiredToken).get()
  
  const startTaskInstruction = StartTaskInstruction(spyTask.get().id, scriptsService, permissionsService)

  const taskId = TaskId("1")
  const task = Task(taskId, "taskName", [startTaskInstruction])

  await runPromise(task.execute(requiredToken))

  expect(spyTask.call()).toBe(1)
})

test("An automation can be created", () => {
  const automationId = AutomationId("1")
  const periodTrigger = PeriodTrigger(new Date(), 10)
  const name = "automationName"
  const automation = Automation(automationId, name, periodTrigger, [])

  expect(automation.enabled).toBe(true)
  expect(automation.id).toBe(automationId)
  expect(automation.trigger).toBe(periodTrigger)
  expect(automation.name).toBe(name)
})
