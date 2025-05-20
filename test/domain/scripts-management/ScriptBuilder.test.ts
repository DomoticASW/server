import { runPromise } from "effect/Effect"
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"
import { DeviceMock, DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, ScriptsServiceSpy, SpyTaskMock, TokenMock, UserMock } from "../../utils/mocks.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { ConstantInstruction } from "../../../src/domain/scripts-management/Instruction.js"
import { NumberEOperator, NumberLOperator } from "../../../src/domain/scripts-management/Operators.js"
import { NodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { InvalidScriptError } from "../../../src/ports/scripts-management/Errors.js"

const builderAndRoot = TaskBuilder("taskName")
const taskBuilder: TaskBuilder = builderAndRoot[0]
const root: NodeRef = builderAndRoot[1]

const user = UserMock()
const token = TokenMock(user.email)
// const email = user.email
const device = DeviceMock()
const deviceId = device.id
const notificationService = NotificationsServiceSpy(user.email).get()
const devicesService = DevicesServiceSpy().get()
const scriptsService = ScriptsServiceSpy().get()
const permissionsService = PermissionsServiceSpy(token).get()

test("An InvalidScriptError can be created", async () => {
  const error = InvalidScriptError("cause")
  expect(error.__brand).toBe("InvalidScriptError")
  expect(error.message).toBe("There is an error in the script syntax")
  expect(error.cause).toBe("cause")
})

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

test("An IfInstruction can be added", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const taskBuilderOneConstant = builderAndConstant[0]

  const builderAndConstant2 = taskBuilderOneConstant.addCreateDevicePropertyConstant(root, "constantName2", Type.IntType, deviceId, device.properties.at(0)!.id)
  const taskBuilderTwoConstants = builderAndConstant2[0]

  const builderAndRef = taskBuilderTwoConstants.addIf(root, builderAndConstant[1], builderAndConstant2[1], NumberEOperator(), false)
  const taskBuilderIf = builderAndRef[0]
  const ifRef = builderAndRef[1]

  const taskBuilderComplete = taskBuilderIf.addWait(ifRef, 0.2)

  const task = await runPromise(taskBuilderComplete.build())
  // [C1 = 10, C2 = 10, If C1 == C2 then [Wait]]

  const start = Date.now()

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, token))

  expect(Date.now()).toBeGreaterThan(start + 0.2 * 1000)
})

test("An IfInstruction does not execute instructions if is evaluated to false", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const taskBuilderOneConstant = builderAndConstant[0]

  const builderAndConstant2 = taskBuilderOneConstant.addCreateDevicePropertyConstant(root, "constantName2", Type.IntType, deviceId, device.properties.at(0)!.id)
  const taskBuilderTwoConstants = builderAndConstant2[0]

  const builderAndRefNegate = taskBuilderTwoConstants.addIf(root, builderAndConstant[1], builderAndConstant2[1], NumberEOperator(), true)
  const taskBuilderIfNegate = builderAndRefNegate[0]
  const negateIfRef = builderAndRefNegate[1]

  const taskBuilderCompleteNegate = taskBuilderIfNegate.addWait(negateIfRef, 0.5)
  const taskNegate = await runPromise(taskBuilderCompleteNegate.build())
  // [C1 = 10, C2 = 10, If C1 != C2 then [Wait]]

  const startNegate = Date.now()
  
  await runPromise(taskNegate.execute(notificationService, scriptsService, permissionsService, devicesService, token))
  
  expect(Date.now()).toBeLessThan(startNegate + 0.5 * 1000)
})

test("A big test with the if instruction", async () => {
  const notificationService = NotificationsServiceSpy(user.email)
  const builderAndConstant1 = taskBuilder.addCreateConstant(root, "number1 Constant", Type.IntType, 10)
  const newTaskBuilder1 = builderAndConstant1[0]
  const builderAndConstant2 = newTaskBuilder1.addCreateConstant(root, "number2 Constant", Type.IntType, 15)
  const newTaskBuilder2 = builderAndConstant2[0]

  const builderAndRef1 = newTaskBuilder2.addWait(root, 0.5).addIf(root, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newTaskBuilder3 = builderAndRef1[0]
  const thenNode1 = builderAndRef1[1]

  const builderAndRef2 = newTaskBuilder3.addSendNotification(thenNode1, user.email, "firstMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), true)
  const newTaskBuilder4 = builderAndRef2[0]
  const thenNode2 = builderAndRef2[1]

  const completeBuilder = newTaskBuilder4.addWait(thenNode2, 0.3).addSendNotification(thenNode2, user.email, "notFired").addSendNotification(thenNode1, user.email, "secondMessage").addWait(thenNode1, 0.2).addSendNotification(root, user.email, "thirdMessage")
  // [C1 = 10, C2 = 15, Wait, If 10 < 15 then [Send, If 10 >= 15 then [Wait, Send], Send, Wait], Send]

  const task = await runPromise(completeBuilder.build())
  const start = Date.now()

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, token))

  expect(Date.now()).toBeGreaterThan(start + 0.7 * 1000)
  expect(notificationService.call()).toBe(3)
  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
})

test("Another big test with the if instruction", async () => {
  const notificationService = NotificationsServiceSpy(user.email)
  const builderAndConstant1 = taskBuilder.addCreateConstant(root, "number1 Constant", Type.IntType, 10)
  const newTaskBuilder1 = builderAndConstant1[0]
  const builderAndConstant2 = newTaskBuilder1.addCreateConstant(root, "number2 Constant", Type.IntType, 15)
  const newTaskBuilder2 = builderAndConstant2[0]

  const builderAndRef1 = newTaskBuilder2.addIf(root, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newTaskBuilder3 = builderAndRef1[0]
  const thenNode1 = builderAndRef1[1]

  const builderAndRef2 = newTaskBuilder3.addSendNotification(thenNode1, user.email, "firstMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newTaskBuilder4 = builderAndRef2[0]
  const thenNode2 = builderAndRef2[1]

  const completeBuilder = newTaskBuilder4.addSendNotification(thenNode2, user.email, "secondMessage").addSendNotification(root, user.email, "thirdMessage")
  // [C1 = 10, C2 = 15, If 10 < 15 then [Send, If 10 < 15 then [Send]], Send]

  const task = await runPromise(completeBuilder.build())

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, token))

  expect(notificationService.call()).toBe(3)
  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
})
