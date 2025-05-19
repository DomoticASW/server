import { runPromise } from "effect/Effect"
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"
import { RootNodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { DeviceMock, DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, ScriptsServiceSpy, SpyTaskMock, TokenMock, UserMock } from "../../utils/mocks.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { ConstantInstruction } from "../../../src/domain/scripts-management/Instruction.js"

const builderAndRoot = TaskBuilder("taskName")
const taskBuilder: TaskBuilder = builderAndRoot[0]
const root: RootNodeRef = builderAndRoot[1]

const user = UserMock()
const token = TokenMock(user.email)
// const email = user.email
const device = DeviceMock()
const deviceId = device.id
const notificationService = NotificationsServiceSpy(user.email).get()
const devicesService = DevicesServiceSpy().get()
const scriptsService = ScriptsServiceSpy().get()
const permissionsService = PermissionsServiceSpy().get()

test("A TaskBuilder can be created", async () => {
  const task = await runPromise(taskBuilder.build())
  expect(task.name).toBe("taskName")
})

test("A wait instruction can be added", async () => {
  const taskBuilderWait = taskBuilder.addWait(root, 0.5)
  const task = await runPromise(taskBuilderWait.build())
  const start = Date.now()

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, token))
  expect(Date.now()).toBeGreaterThan(start + 0.5 * 1000)
})


test("A SendNotificationInstruction can be added", async () => {
  const taskBuilderSendNotification = taskBuilder.addSendNotification(root, user.email, "message")
  const task = await runPromise(taskBuilderSendNotification.build())
  const notificationService = NotificationsServiceSpy(user.email)
  
  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, token))
  expect(notificationService.call()).toBe(1)
})

test("Adding instructions does not modify the builder (it is immutable, returning the new one)", async () => {
  taskBuilder.addSendNotification(root, user.email, "message")
  const task = await runPromise(taskBuilder.build())
  const notificationService = NotificationsServiceSpy(user.email)
  
  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, token))
  expect(notificationService.call()).toBe(0)
})

test("A DeviceActionInstruction can be added", async () => {
  const devicesService = DevicesServiceSpy(device)
  const taskBuilderDeviceAction  = taskBuilder.addDeviceAction(root, deviceId, device.actions.at(0)!.id, 10)
  const task = await runPromise(taskBuilderDeviceAction.build())

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService.get(), token))
  expect(devicesService.call()).toBe(1)
})

test("A StartTaskInstruction can be added", async () => {
  const startedTask = SpyTaskMock()
  const scriptsService = ScriptsServiceSpy(startedTask.get())
  const permissionsService = PermissionsServiceSpy(token)

  const taskBuilderStartTask = taskBuilder.addStartTask(root, startedTask.get().id)
  const task = await runPromise(taskBuilderStartTask.build())

  await runPromise(task.execute(notificationService, scriptsService.get(), permissionsService.get(), devicesService, token))

  expect(permissionsService.call()).toBe(1)
  expect(scriptsService.call()).toBe(1)
  expect(startedTask.call()).toBe(1)
})

test("A CreateConstantInstruction can be added", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const taskBuilderCreateConstant = builderAndConstant[0]
  const ref = builderAndConstant[1]

  const task = await runPromise(taskBuilderCreateConstant.build())

  const env = await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, token))

  expect(env.constants.size).toBe(1)

  const instruction = task.instructions.at(0)
  expect(instruction).toBeDefined()
  const constant = env.constants.get(instruction as ConstantInstruction<number>)
  expect(constant).toBeDefined()
  expect(constant?.value).toBe<number>(10)

  expect(ref.type).toBe(Type.IntType)
  expect(ref.name).toBe("constantName")
})

test("A CreateDevicePropertyConstantInstruction can be added", async () => {
  const devicesService = DevicesServiceSpy(device, false)
  const builderAndConstant = taskBuilder.addCreateDevicePropertyConstant(root, "constantName", Type.IntType, deviceId, device.properties.at(0)!.id)
  const taskBuilderPropertyConstant = builderAndConstant[0]
  const ref = builderAndConstant[1]

  const task = await runPromise(taskBuilderPropertyConstant.build())

  const env = await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService.get(), token))

  expect(env.constants.size).toBe(1)
  expect(devicesService.call()).toBe(1)

  const instruction = task.instructions.at(0)
  expect(instruction).toBeDefined()
  const constant = env.constants.get(instruction as ConstantInstruction<number>)
  expect(constant).toBeDefined();
  expect(constant?.value).toBe<number>(device.properties.at(0)!.value as number)

  expect(ref.name).toBe("constantName")
  expect(ref.type).toBe(Type.IntType)
})
