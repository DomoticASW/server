import { match, runPromise } from "effect/Effect"
import { CreateConstantInstruction, IfElseInstruction, SendNotificationInstruction, StartTaskInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { Automation, AutomationId, Task, TaskId } from "../../../src/domain/scripts-management/Script.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { ScriptError, ScriptNotFoundError } from "../../../src/ports/scripts-management/Errors.js"
import { DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, ScriptsServiceSpy, SpyTaskMock, TokenMock } from "../../utils/mocks.js"
import { pipe } from "effect"
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js"
import { PeriodTrigger } from "../../../src/domain/scripts-management/Trigger.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { Condition } from "../../../src/domain/scripts-management/Instruction.js"
import { NumberEOperator } from "../../../src/domain/scripts-management/Operators.js"

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
  const notificationService = NotificationsServiceSpy(Email("email"))
  const instruction1 = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const instruction2 = CreateConstantInstruction("constantName2", Type.IntType, 15)
  const ifElseInstruction = IfElseInstruction([SendNotificationInstruction(Email("email"), "thenMessage")], [SendNotificationInstruction(Email("email"), "elseMessage")], Condition(instruction1, instruction2, NumberEOperator()))
  const instructions = [
    instruction1,
    instruction2,
    ifElseInstruction
  ]

  const task = Task(taskId, "taskName", instructions)
  const env = await runPromise(task.execute(notificationService.get(), ScriptsServiceSpy().get(), PermissionsServiceSpy().get(), DevicesServiceSpy().get(), TokenMock("email")))

  expect(env.constants.get(instruction1)).toBeDefined()
  expect(env.constants.get(instruction2)).toBeDefined()
  expect(notificationService.getMessages()).toStrictEqual(["thenMessage"])
})

test("A task cannot execute another task if token has not the permissions", async () => {
  const spyTask = SpyTaskMock().get()
  const scriptsService = ScriptsServiceSpy(spyTask, true).get()
  const requiredToken = TokenMock("email")
  const permissionsService = PermissionsServiceSpy(requiredToken).get()
  
  const startTaskInstruction = StartTaskInstruction(spyTask.id)
  
  const taskId = TaskId("1")
  const task = Task(taskId, "taskName", [startTaskInstruction])
  
  await pipe(
    task.execute(NotificationsServiceSpy(requiredToken.userEmail).get(),scriptsService, permissionsService, DevicesServiceSpy().get(), TokenMock("otherEmail")),
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
  
  const startTaskInstruction = StartTaskInstruction(spyTask.get().id)

  const taskId = TaskId("1")
  const task = Task(taskId, "taskName", [startTaskInstruction])

  await runPromise(task.execute(NotificationsServiceSpy(requiredToken.userEmail).get(), scriptsService, permissionsService, DevicesServiceSpy().get(), requiredToken))

  expect(spyTask.call()).toBe(1)
})

test("An automation can be created", async () => {
  const automationId = AutomationId("1")
  const periodTrigger = PeriodTrigger(new Date(), 100000)
  const name = "automationName"
  const automation = Automation(automationId, name, periodTrigger, [])
  
  expect(automation.enabled).toBe(true)
  expect(automation.id).toBe(automationId)
  expect(automation.trigger).toBe(periodTrigger)
  expect(automation.name).toBe(name)
})

test("An automation can be executed", async () => {
  const automationId = AutomationId("1")
  const periodTrigger = PeriodTrigger(new Date(), 100000)
  const instruction1 = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const instruction2 = CreateConstantInstruction("constantName2", Type.IntType, 25)
  const instructions = [
    instruction1,
    instruction2
  ]

  const automation = Automation(automationId, "automationName", periodTrigger, instructions)
  const env = await runPromise(automation.execute(NotificationsServiceSpy(Email("email")).get(), ScriptsServiceSpy().get(), PermissionsServiceSpy().get(), DevicesServiceSpy().get()))

  expect(env.constants.get(instruction1)).toBeDefined()
  expect(env.constants.get(instruction2)).toBeDefined()
})

// test("An automation will be executed with a period trigger", async () => {
//   const periodSeconds = 0.25
//   const millisecondsToWaitToStart = 250
//   const periodTrigger = PeriodTrigger(new Date(Date.now() + millisecondsToWaitToStart), periodSeconds)
//   const instructionSpy = InstructionSpy()

//   const automation = Automation(AutomationId("1"), "name", periodTrigger, [instructionSpy.get()])

//   automation.enable()

//   expect(instructionSpy.call()).toBe(0)

//   await runPromise(sleep(millis(periodTrigger.start.getTime() - Date.now() + 50)))

//   expect(instructionSpy.call()).toBe(1)

//   await runPromise(sleep(millis(periodSeconds * 1000)))

//   expect(instructionSpy.call()).toBe(2)

//   await runPromise(sleep(millis(periodSeconds * 1000)))

//   expect(instructionSpy.call()).toBe(3)
  
//   automation.disable()
  
//   await runPromise(sleep(millis(periodSeconds * 1000)))
//   expect(instructionSpy.call()).toBe(3)
// })

// test("An automation with a DeviceEventTrigger should be fired when a device event triggers", async () => {
//   const device = DeviceMock("triggeringEvent")
//   const devicesService = DevicesServiceSpy(device).get()
//   const deviceEventsService = new DeviceEventsServiceImpl(devicesService)
//   const instructionSpy = InstructionSpy()
  
//   const automation = Automation(AutomationId("1"), "name", DeviceEventTrigger(device.id, "triggeringEvent"), [instructionSpy.get()])
//   deviceEventsService.subscribeForDeviceEvents(automation)

//   automation.enable()

//   expect(instructionSpy.call()).toBe(0)

//   await runPromise(deviceEventsService.publishEvent(device.id, "triggeringEvent"))
//   await runPromise(sleep(millis(50)))
  
//   expect(instructionSpy.call()).toBe(1)
  
//   await runPromise(deviceEventsService.publishEvent(device.id, "triggeringEvent"))
//   await runPromise(sleep(millis(50)))

//   expect(instructionSpy.call()).toBe(2)
  
//   automation.disable()
  
//   await runPromise(deviceEventsService.publishEvent(device.id, "triggeringEvent"))
//   await runPromise(sleep(millis(50)))

//   expect(instructionSpy.call()).toBe(2)
// })

// test("An automation with a DeviceEventTrigger is not fired if the event is not the right one", async () => {
//   const device = DeviceMock("triggeringEvent")
//   const devicesService = DevicesServiceSpy(device).get()
//   const deviceEventsService = new DeviceEventsServiceImpl(devicesService)
//   const instructionSpy = InstructionSpy()
  
//   const automation = Automation(AutomationId("1"), "name", DeviceEventTrigger(device.id, "triggeringEvent"), [instructionSpy.get()])
//   deviceEventsService.subscribeForDeviceEvents(automation)

//   automation.enable()

//   expect(instructionSpy.call()).toBe(0)

//   await runPromise(deviceEventsService.publishEvent(device.id, "otherEvent"))
//   await runPromise(sleep(millis(50)))
  
//   expect(instructionSpy.call()).toBe(0)
// })