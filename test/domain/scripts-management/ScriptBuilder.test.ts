import { runPromise } from "effect/Effect"
import { AutomationBuilderWithDeviceEventTrigger, AutomationBuilderWithPeriodtrigger, TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"
import { DeviceActionsServiceSpy, DeviceMock, DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, ScriptsServiceSpy, SpyTaskMock, TokenMock, UserMock } from "../../utils/mocks.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { ConstantInstruction } from "../../../src/domain/scripts-management/Instruction.js"
import { NumberEOperator, NumberLOperator, StringEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { NodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { InvalidScriptError } from "../../../src/ports/scripts-management/Errors.js"
import { Effect, pipe } from "effect"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"

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
const deviceActionsService = DeviceActionsServiceSpy().get()
const scriptsService = ScriptsServiceSpy().get()
const permissionsService = PermissionsServiceSpy(token).get()

test("An InvalidScriptError can be created", async () => {
  const error = InvalidScriptError("cause")
  expect(error.__brand).toBe("InvalidScriptError")
  expect(error.message).toBe("There is an error in the script syntax")
  expect(error.cause).toBe("cause")
})

test("A TaskBuilder can create a Task", async () => {
  const task = await runPromise(taskBuilder.build())
  expect(task.name).toBe("taskName")
})

test("A wait instruction can be added", async () => {
  const taskBuilderWait = taskBuilder.addWait(root, 0.5)
  const task = await runPromise(taskBuilderWait.build())
  const start = Date.now()

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, deviceActionsService, token))
  expect(Date.now()).toBeGreaterThanOrEqual(start + 0.5 * 1000)
})


test("A SendNotificationInstruction can be added", async () => {
  const taskBuilderSendNotification = taskBuilder.addSendNotification(root, user.email, "message")
  const task = await runPromise(taskBuilderSendNotification.build())
  const notificationService = NotificationsServiceSpy(user.email)

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))
  expect(notificationService.call()).toBe(1)
})

test("Adding instructions does not modify the builder (it is immutable, returning the new one)", async () => {
  taskBuilder.addSendNotification(root, user.email, "message")
  const task = await runPromise(taskBuilder.build())
  const notificationService = NotificationsServiceSpy(user.email)

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))
  expect(notificationService.call()).toBe(0)
})

test("A DeviceActionInstruction can be added", async () => {
  const deviceActionsService = DeviceActionsServiceSpy(device)
  const taskBuilderDeviceAction = taskBuilder.addDeviceAction(root, deviceId, device.actions.at(0)!.id, 10)
  const task = await runPromise(taskBuilderDeviceAction.build())

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, deviceActionsService.get(), token))
  expect(deviceActionsService.call()).toBe(1)
})

test("A StartTaskInstruction can be added", async () => {
  const startedTask = SpyTaskMock()
  const scriptsService = ScriptsServiceSpy(startedTask.get())
  const permissionsService = PermissionsServiceSpy(token)

  const taskBuilderStartTask = taskBuilder.addStartTask(root, startedTask.get().id)
  const task = await runPromise(taskBuilderStartTask.build())

  await runPromise(task.execute(notificationService, scriptsService.get(), permissionsService.get(), devicesService, deviceActionsService, token))

  expect(permissionsService.call()).toBe(1)
  expect(scriptsService.call()).toBe(1)
  expect(startedTask.call()).toBe(1)
})

test("A CreateConstantInstruction can be added", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const taskBuilderCreateConstant = builderAndConstant[0]
  const ref = builderAndConstant[1]

  const task = await runPromise(taskBuilderCreateConstant.build())

  const env = await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(env.constants.size).toBe(1)

  const instruction = task.instructions.at(0)
  expect(instruction).toBeDefined()
  const constant = env.constants.get(instruction as ConstantInstruction<number>)
  expect(constant).toBeDefined()
  expect(constant?.value).toBe<number>(10)

  expect(ref.constantInstruction.name).toBe("constantName")
  expect(ref.constantInstruction.type).toBe(Type.IntType)
})

test("A CreateDevicePropertyConstantInstruction can be added", async () => {
  const devicesService = DevicesServiceSpy(device)
  const builderAndConstant = taskBuilder.addCreateDevicePropertyConstant(root, "constantName", Type.IntType, deviceId, device.properties.at(0)!.id)
  const taskBuilderPropertyConstant = builderAndConstant[0]
  const ref = builderAndConstant[1]

  const task = await runPromise(taskBuilderPropertyConstant.build())

  const env = await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService.get(), deviceActionsService, token))

  expect(env.constants.size).toBe(1)
  expect(devicesService.call()).toBe(1)

  const instruction = task.instructions.at(0)
  expect(instruction).toBeDefined()
  const constant = env.constants.get(instruction as ConstantInstruction<number>)
  expect(constant).toBeDefined();
  expect(constant?.value).toBe<number>(device.properties.at(0)!.value as number)

  expect(ref.constantInstruction.name).toBe("constantName")
  expect(ref.constantInstruction.type).toBe(Type.IntType)
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

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(Date.now()).toBeGreaterThanOrEqual(start + 0.2 * 1000)
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

  await runPromise(taskNegate.execute(notificationService, scriptsService, permissionsService, devicesService, deviceActionsService, token))

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

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(Date.now()).toBeGreaterThanOrEqual(start + 0.7 * 1000)
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

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.call()).toBe(3)
  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
})

test("If as last instruction", async () => {
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

  const completeBuilder = newTaskBuilder4.addSendNotification(thenNode2, user.email, "secondMessage")
  // [C1 = 10, C2 = 15, If 10 < 15 then [Send, If 10 < 15 then [Send]]]

  const task = await runPromise(completeBuilder.build())

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.call()).toBe(2)
  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage"])
})

test("Consecutive ifs on same scope", async () => {
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

  const builderAndRef3 = newTaskBuilder4.addSendNotification(thenNode2, user.email, "secondMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const completeBuilder = builderAndRef3[0].addSendNotification(builderAndRef3[1], user.email, "thirdMessage")
  // [C1 = 10, C2 = 15, If 10 < 15 then [Send, If 10 < 15 then [Send], If 10 < 15 then[Send]]]

  const task = await runPromise(completeBuilder.build())

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.call()).toBe(3)
  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
})

test("Consecutive ifs on root scope, with the second if just after a inner if of another scope", async () => {
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

  const builderAndRef3 = newTaskBuilder4.addSendNotification(thenNode2, user.email, "secondMessage").addIf(root, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const completeBuilder = builderAndRef3[0].addSendNotification(builderAndRef3[1], user.email, "thirdMessage")
  // [C1 = 10, C2 = 15, If 10 < 15 then [Send, If 10 < 15 then [Send]], If 10 < 15 then[Send]]

  const task = await runPromise(completeBuilder.build())

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
  expect(notificationService.call()).toBe(3)
})

test("Consecutive ifs on inner scope", async () => {
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

  const builderAndRef3 = newTaskBuilder4.addIf(thenNode2, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newTaskBuilder5 = builderAndRef3[0]
  const thenNode3 = builderAndRef3[1]

  const builderAndRef4 = newTaskBuilder5.addSendNotification(thenNode3, user.email, "secondMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const completeBuilder = builderAndRef4[0].addSendNotification(builderAndRef4[1], user.email, "thirdMessage")
  // [ C1 = 10, C2 = 15, If 10 < 15 then [ Send, If 10 < 15 then [ If 10 < 15 Then [Send] ], If 10 < 15 then[ Send ] ] ]

  const task = await runPromise(completeBuilder.build())

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
  expect(notificationService.call()).toBe(3)
})

test("An InvalidScriptError is returned if using a constant not defined ", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const taskBuilderOneConstant = builderAndConstant[0]

  const builderAndConstant2 = taskBuilderOneConstant.addCreateDevicePropertyConstant(root, "constantName2", Type.IntType, deviceId, device.properties.at(0)!.id)
  const taskBuilderTwoConstants = builderAndConstant2[0]

  const builderAndRef = taskBuilderTwoConstants.addIf(root, builderAndConstant[1], builderAndConstant2[1], NumberEOperator(), false)
  const taskBuilderIf = builderAndRef[0]
  const ifRef = builderAndRef[1]

  const builderAndConstant3 = taskBuilderIf.addSendNotification(ifRef, user.email, "firstMessage").addCreateConstant(ifRef, "constantName3", Type.StringType, "string")
  const builderAndConstant4 = builderAndConstant3[0].addCreateConstant(ifRef, "constantName4", Type.StringType, "anotherString")
  const builderAndRef2 = builderAndConstant4[0].addIf(root, builderAndConstant3[1], builderAndConstant4[1], StringEOperator(), true)
  const taskBuilderComplete = builderAndRef2[0].addSendNotification(builderAndRef2[1], user.email, "secondMessage")

  // [C1 = 10, C2 = 10, If C1 == C2 then [ Send, C3 = "string", C4 = "anotherString" ], If C3 != C4 then [ Send ] ]
  await runPromise(pipe(
    taskBuilderComplete.build(),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(error) {
        expect(error.cause).toBe("The constant constantName3 was not defined inside of the if's scope, The constant constantName4 was not defined inside of the if's scope")
      },
    })
  ))
})

test("An IfElse instruction can be created", async () => {
  const notificationService = NotificationsServiceSpy(user.email)
  const builderAndConstant1 = taskBuilder.addCreateConstant(root, "number1 Constant", Type.IntType, 10)
  const newTaskBuilder1 = builderAndConstant1[0]
  const builderAndConstant2 = newTaskBuilder1.addCreateConstant(root, "number2 Constant", Type.IntType, 15)
  const newTaskBuilder2 = builderAndConstant2[0]

  const builderAndRef1 = newTaskBuilder2.addIfElse(root, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newTaskBuilder3 = builderAndRef1[0]
  const thenNode1 = builderAndRef1[1]
  const elseNode1 = builderAndRef1[2]

  const builderAndRef2 = newTaskBuilder3.addSendNotification(thenNode1, user.email, "firstMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newTaskBuilder4 = builderAndRef2[0]
  const thenNode2 = builderAndRef2[1]

  const builderAndRef3 = newTaskBuilder4.addIfElse(thenNode2, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), true)
  const newTaskBuilder5 = builderAndRef3[0]
  const thenNode3 = builderAndRef3[1]
  const elseNode2 = builderAndRef3[2]

  const builderAndRef4 = newTaskBuilder5.addSendNotification(thenNode3, user.email, "notSent1").addSendNotification(elseNode2, user.email, "secondMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const completeBuilder = builderAndRef4[0].addSendNotification(builderAndRef4[1], user.email, "thirdMessage").addSendNotification(elseNode1, user.email, "notSent2")
  // [
  // C1 = 10, 
  // C2 = 15, 
  // If 10 < 15
  // then [
  //    Send, 
  //    If 10 < 15 
  //      then [
  //        If 10 >= 15 Then [ Send ] else [ Send ] 
  //      ], 
  //    If 10 < 15 
  //      then [ Send ] 
  // ] 
  // else [ Send ] ]

  const task = await runPromise(completeBuilder.build())

  await runPromise(task.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
  expect(notificationService.call()).toBe(3)
})

test("An InvalidScriptError is returned if using a constant not defined also with ifElse", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const taskBuilderOneConstant = builderAndConstant[0]

  const builderAndConstant2 = taskBuilderOneConstant.addCreateDevicePropertyConstant(root, "constantName2", Type.IntType, deviceId, device.properties.at(0)!.id)
  const taskBuilderTwoConstants = builderAndConstant2[0]

  const builderAndRef = taskBuilderTwoConstants.addIf(root, builderAndConstant[1], builderAndConstant2[1], NumberEOperator(), false)
  const taskBuilderIf = builderAndRef[0]
  const ifRef = builderAndRef[1]

  const builderAndConstant3 = taskBuilderIf.addSendNotification(ifRef, user.email, "firstMessage").addCreateConstant(ifRef, "constantName3", Type.StringType, "string")
  const builderAndConstant4 = builderAndConstant3[0].addCreateConstant(ifRef, "constantName4", Type.StringType, "anotherString")
  const builderAndRef2 = builderAndConstant4[0].addIfElse(root, builderAndConstant3[1], builderAndConstant4[1], StringEOperator(), true)
  const taskBuilderComplete = builderAndRef2[0].addSendNotification(builderAndRef2[1], user.email, "secondMessage").addSendNotification(builderAndRef2[2], user.email, "notSent")

  // [C1 = 10, C2 = 10, If C1 == C2 then [ Send, C3 = "string", C4 = "anotherString" ], If C3 != C4 then [ Send ] else [ Send ] ]
  await runPromise(pipe(
    taskBuilderComplete.build(),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(error) {
        expect(error.cause).toBe("The constant constantName3 was not defined inside of the if's scope, The constant constantName4 was not defined inside of the if's scope")
      },
    })
  ))
})

test("An automationBuilder can be created", async () => {
  const automationBuilder = AutomationBuilderWithPeriodtrigger("periodAutomation", new Date(), 0.5)
  const root = automationBuilder[1]

  const notificationService = NotificationsServiceSpy(user.email)
  const builderAndConstant1 = automationBuilder[0].addCreateConstant(root, "number1 Constant", Type.IntType, 10)
  const newAutomationBuilder1 = builderAndConstant1[0]
  const builderAndConstant2 = newAutomationBuilder1.addCreateConstant(root, "number2 Constant", Type.IntType, 15)
  const newAutomationBuilder2 = builderAndConstant2[0]

  const builderAndRef1 = newAutomationBuilder2.addIfElse(root, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newAutomationBuilder3 = builderAndRef1[0]
  const thenNode1 = builderAndRef1[1]
  const elseNode1 = builderAndRef1[2]

  const builderAndRef2 = newAutomationBuilder3.addSendNotification(thenNode1, user.email, "firstMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const newAutomationBuilder4 = builderAndRef2[0]
  const thenNode2 = builderAndRef2[1]

  const builderAndRef3 = newAutomationBuilder4.addIfElse(thenNode2, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), true)
  const newAutomationBuilder5 = builderAndRef3[0]
  const thenNode3 = builderAndRef3[1]
  const elseNode2 = builderAndRef3[2]

  const builderAndRef4 = newAutomationBuilder5.addSendNotification(thenNode3, user.email, "notSent1").addSendNotification(elseNode2, user.email, "secondMessage").addIf(thenNode1, builderAndConstant1[1], builderAndConstant2[1], NumberLOperator(), false)
  const completeBuilder = builderAndRef4[0].addSendNotification(builderAndRef4[1], user.email, "thirdMessage").addSendNotification(elseNode1, user.email, "notSent2")
  // [
  // C1 = 10, 
  // C2 = 15, 
  // If 10 < 15
  // then [
  //    Send, 
  //    If 10 < 15 
  //      then [
  //        If 10 >= 15 Then [ Send ] else [ Send ] 
  //      ], 
  //    If 10 < 15 
  //      then [ Send ] 
  // ] 
  // else [ Send ] ]

  const automation = await runPromise(completeBuilder.build())

  await runPromise(automation.execute(notificationService.get(), scriptsService, permissionsService, devicesService, deviceActionsService, token))

  expect(notificationService.getMessages()).toStrictEqual(["firstMessage", "secondMessage", "thirdMessage"])
  expect(notificationService.call()).toBe(3)
})

test("An InvalidScriptError is returned if using a constant not defined also with an Automation builder ", async () => {
  const automationBuilder = AutomationBuilderWithDeviceEventTrigger("periodAutomation", DeviceMock().id, "event")
  const root = automationBuilder[1]

  const builderAndConstant = automationBuilder[0].addCreateConstant(root, "constantName", Type.IntType, 10)
  const automationBuilderOneConstant = builderAndConstant[0]

  const builderAndConstant2 = automationBuilderOneConstant.addCreateDevicePropertyConstant(root, "constantName2", Type.IntType, deviceId, device.properties.at(0)!.id)
  const automationBuilderTwoConstants = builderAndConstant2[0]

  const builderAndRef = automationBuilderTwoConstants.addIf(root, builderAndConstant[1], builderAndConstant2[1], NumberEOperator(), false)
  const automationBuilderIf = builderAndRef[0]
  const ifRef = builderAndRef[1]

  const builderAndConstant3 = automationBuilderIf.addSendNotification(ifRef, user.email, "firstMessage").addCreateConstant(ifRef, "constantName3", Type.StringType, "string")
  const builderAndConstant4 = builderAndConstant3[0].addCreateConstant(ifRef, "constantName4", Type.StringType, "anotherString")
  const builderAndRef2 = builderAndConstant4[0].addIf(root, builderAndConstant3[1], builderAndConstant4[1], StringEOperator(), true)
  const automationBuilderComplete = builderAndRef2[0].addSendNotification(builderAndRef2[1], user.email, "secondMessage")

  // [C1 = 10, C2 = 10, If C1 == C2 then [ Send, C3 = "string", C4 = "anotherString" ], If C3 != C4 then [ Send ] ]
  await runPromise(pipe(
    automationBuilderComplete.build(),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(error) {
        expect(error.cause).toBe("The constant constantName3 was not defined inside of the if's scope, The constant constantName4 was not defined inside of the if's scope")
      },
    })
  ))
})

test("A TaskBuilder can create a Task from an Id", async () => {
  const task = await runPromise(taskBuilder.buildWithId(TaskId("1")))
  expect(task.name).toBe("taskName")
  expect(task.id).toBe("1")
})
