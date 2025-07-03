import { Effect, pipe } from "effect"
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js"
import { Condition, ConstantValue, ExecutionEnvironment, ExecutionEnvironmentCopy } from "../../../src/domain/scripts-management/Instruction.js"
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { NumberGOperator, NumberLEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { DevicesServiceSpy, NotificationsServiceSpy, ScriptsServiceSpy, DeviceMock, SpyTaskMock, UserNotFoundErrorMock, TokenMock, PermissionsServiceSpy, DeviceActionsServiceSpy } from "../../utils/mocks.js"
import { InvalidConstantTypeError, ScriptError, ScriptNotFoundError } from "../../../src/ports/scripts-management/Errors.js"
import { DeviceNotFoundError, DevicePropertyNotFound } from "../../../src/ports/devices-management/Errors.js"
import { Color } from "../../../src/domain/devices-management/Types.js"
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js"

const notificationServiceMock = NotificationsServiceSpy(Email("email")).get()
const scriptsServiceMock = ScriptsServiceSpy().get()
const permissionsServiceMock = PermissionsServiceSpy().get()
const devicesServiceMock = DevicesServiceSpy().get()
const deviceActionsServiceMock = DeviceActionsServiceSpy().get()

test("An execution environment can be created", () => {
  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  expect(env.constants.size).toBe(0)
})

test("An execution environment can be cpied", () => {
  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const env2 = ExecutionEnvironmentCopy(env)
  expect(env2.constants.size).toBe(env.constants.size)
  expect(env2.constants).not.toBe(env.constants)
  expect(env2.devicesService).toBe(env.devicesService)
  expect(env2.notificationsService).toBe(env.notificationsService)
  expect(env2.scriptsService).toBe(env.scriptsService)
  expect(env2.permissionsService).toBe(env.permissionsService)
})

test("A constant value can be created", () => {
  const value = ConstantValue(10)
  expect(value.value).toBe(10)
})

test("A send notification instruction can be created", () => {
  const instruction = SendNotificationInstruction(Email("email"), "this is a message")
  expect(instruction.email).toBe("email")
  expect(instruction.message).toBe("this is a message")
})

test("A wait instruction can be created", () => {
  const instruction = WaitInstruction(1)
  expect(instruction.seconds).toBe(1)
})

test("A start task instruction can be created", () => {
  const instruction = StartTaskInstruction(TaskId("1"))
  expect(instruction.taskId).toBe("1")
})

test("A device action instruction can be created", () => {
  const instruction = DeviceActionInstruction(DeviceId("deviceId"), DeviceActionId("deviceActionId"), 10)
  expect(instruction.deviceId).toBe("deviceId")
  expect(instruction.deviceActionId).toBe("deviceActionId")
  expect(instruction.input).toBe(10)
})

test("A create constant instruction can be created", () => {
  const instruction = CreateConstantInstruction("constantName", Type.IntType, 10)
  expect(instruction.name).toBe("constantName");
  expect(instruction.type).toBe(Type.IntType);
  expect(instruction.value).toBe(10);
})

test("A create constant instruction add a value to the env when executed", async () => {
  const instruction = CreateConstantInstruction("constantName", Type.IntType, 10)
  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const result = await Effect.runPromise(instruction.execute(env))
  expect(result.constants.size).toBe(1)
  expect(env.constants.size).toBe(0)

  const constant = result.constants.get(instruction);
  expect(constant).toBeDefined();
  expect(constant?.value).toBe<number>(10);
})

test("A create constant instruction add a value to the env when executed with the right type", async () => {
  function createVoid(): void { }
  const voidValue = createVoid()
  const color = Color(10, 10, 10)

  const instruction = CreateConstantInstruction("constantName", Type.StringType, "hello!")
  const instruction2 = CreateConstantInstruction("constantName", Type.IntType, 10)
  const instruction3 = CreateConstantInstruction("constantName", Type.DoubleType, 10.5)
  const instruction4 = CreateConstantInstruction("constantName", Type.ColorType, color)
  const instruction5 = CreateConstantInstruction("constantName", Type.VoidType, voidValue)

  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const result1 = await Effect.runPromise(instruction.execute(env))
  const result2 = await Effect.runPromise(instruction2.execute(env))
  const result3 = await Effect.runPromise(instruction3.execute(env))
  const result4 = await Effect.runPromise(instruction4.execute(env))
  const result5 = await Effect.runPromise(instruction5.execute(env))

  const constant1 = result1.constants.get(instruction);
  const constant2 = result2.constants.get(instruction2);
  const constant3 = result3.constants.get(instruction3);
  const constant4 = result4.constants.get(instruction4);
  const constant5 = result5.constants.get(instruction5);

  expect(constant1?.value).toBe<string>("hello!");
  expect(constant2?.value).toBe<number>(10);
  expect(constant3?.value).toBe<number>(10.5);
  expect(constant4?.value).toBe<Color>(color);
  expect(constant5?.value).toBe<void>(voidValue);
})

test("A create constant instruction execution should return a ScriptError if the type is wrong", async () => {
  function voidValue(): void { }
  const instruction = CreateConstantInstruction("constantName", Type.StringType, 10)
  const instruction2 = CreateConstantInstruction("constantName", Type.IntType, "hello!")
  const instruction3 = CreateConstantInstruction("constantName", Type.ColorType, voidValue())
  const instruction4 = CreateConstantInstruction("constantName", Type.DoubleType, Color(10, 10, 10))
  const instruction5 = CreateConstantInstruction("constantName", Type.VoidType, 10.5)

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(InvalidConstantTypeError().message + ": " + Type.StringType)
      }
    }),
    Effect.runPromise
  )

  await pipe(
    instruction2.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(InvalidConstantTypeError().message + ": " + Type.IntType)
      }
    }),
    Effect.runPromise
  )

  await pipe(
    instruction3.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(InvalidConstantTypeError().message + ": " + Type.ColorType)
      }
    }),
    Effect.runPromise
  )

  await pipe(
    instruction4.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(InvalidConstantTypeError().message + ": " + Type.DoubleType)
      }
    }),
    Effect.runPromise
  )

  await pipe(
    instruction5.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(InvalidConstantTypeError().message + ": " + Type.VoidType)
      }
    }),
    Effect.runPromise
  )
})

test("A create device property constant instruction can be created", () => {
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.IntType, DeviceId("deviceId"), DevicePropertyId("devicePropertyId"))
  expect(instruction.name).toBe("constantName")
  expect(instruction.type).toBe(Type.IntType)
  expect(instruction.deviceId).toBe("deviceId")
  expect(instruction.devicePropertyId).toBe("devicePropertyId")
})

test("A condition can be created", async () => {
  const instruction1 = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const instruction2 = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const condition = Condition(instruction1, instruction2, NumberGOperator())
  const condition2 = Condition(instruction1, instruction2, NumberLEOperator())

  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const newEnv = await Effect.runPromise(
    instruction2.execute(
      await Effect.runPromise(instruction1.execute(env))
    )
  )
  expect(condition.evaluate(newEnv)).toBe(true)
  expect(condition2.evaluate(newEnv)).toBe(false)
})

test("A condition can be created with a negate bool", async () => {
  const instruction1 = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const instruction2 = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const condition = Condition(instruction1, instruction2, NumberGOperator(), true)
  const condition2 = Condition(instruction1, instruction2, NumberLEOperator(), true)

  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const newEnv = await Effect.runPromise(
    instruction2.execute(
      await Effect.runPromise(instruction1.execute(env))
    )
  )
  expect(condition.evaluate(newEnv)).toBe(false)
  expect(condition2.evaluate(newEnv)).toBe(true)
})

test("An if instruction can be created", async () => {
  //SETUP instructions, conditions and environment
  const left = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const right = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const thenInstruction1 = CreateConstantInstruction("constantName3", Type.StringType, "stringa")
  const thenInstruction2 = CreateConstantInstruction("constantName4", Type.StringType, "stringa2")

  const thenInstructions = [
    thenInstruction1,
    thenInstruction2
  ]

  const condition = Condition(left, right, NumberGOperator())
  const negatedCondition = Condition(left, right, NumberGOperator(), true)

  const setupEnv = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const env = await Effect.runPromise(
    right.execute(
      await Effect.runPromise(left.execute(setupEnv))
    )
  )

  const ifInstruction = IfInstruction(thenInstructions, condition)
  const falseIfInstruction = IfInstruction(thenInstructions, negatedCondition)

  //ACT
  const ifResult = await Effect.runPromise(ifInstruction.execute(env))
  const falseIfResult = await Effect.runPromise(falseIfInstruction.execute(env))
  const stringInstruction1 = ifResult.constants.get(thenInstruction1)
  const stringInstruction2 = ifResult.constants.get(thenInstruction2)
  const undefinedInstruction1 = falseIfResult.constants.get(thenInstruction1)
  const undefinedInstruction2 = falseIfResult.constants.get(thenInstruction1)

  //ASSERT
  expect(stringInstruction1).toBeDefined()
  expect((await Effect.runPromise(thenInstruction1.execute(env)))
    .constants.get(thenInstruction1)).toStrictEqual(stringInstruction1)

  expect(stringInstruction2).toBeDefined()
  expect((await Effect.runPromise(thenInstruction2.execute(env)))
    .constants.get(thenInstruction2)).toStrictEqual(stringInstruction2)

  expect(undefinedInstruction1).not.toBeDefined()
  expect(undefinedInstruction2).not.toBeDefined()
})

test("An else instruction can be created", async () => {
  //SETUP instructions, conditions and environment
  const left = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const right = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const thenInstruction = CreateConstantInstruction("constantName3", Type.StringType, "stringa")
  const elseInstruction = CreateConstantInstruction("constantName4", Type.StringType, "stringa2")

  const thenInstructions = [
    thenInstruction
  ]

  const elseInstructions = [
    elseInstruction
  ]

  const condition = Condition(left, right, NumberGOperator())
  const negatedCondition = Condition(left, right, NumberGOperator(), true)

  const setupEnv = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))
  const env = await Effect.runPromise(right.execute(await Effect.runPromise(left.execute(setupEnv))))

  const elseIfInstruction = IfElseInstruction(thenInstructions, elseInstructions, condition)
  const falseElseIfInstruction = IfElseInstruction(thenInstructions, elseInstructions, negatedCondition)

  //ACT
  const stringInstruction1 = (await Effect.runPromise(elseIfInstruction.execute(env))).constants.get(thenInstruction)
  const stringInstruction2 = (await Effect.runPromise(falseElseIfInstruction.execute(env))).constants.get(elseInstruction)

  //ASSERT
  expect(stringInstruction1).toBeDefined()
  expect((await Effect.runPromise(thenInstruction.execute(env)))
    .constants.get(thenInstruction)).toStrictEqual(stringInstruction1)

  expect(stringInstruction2).toBeDefined()
  expect((await Effect.runPromise(elseInstruction.execute(env)))
    .constants.get(elseInstruction)).toStrictEqual(stringInstruction2)
})

test("A wait instruction should stop the task for a given period of time", async () => {
  const instruction = WaitInstruction(1)
  const start = Date.now()
  await Effect.runPromise(instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))))
  expect(Date.now()).toBeGreaterThanOrEqual(start + 1 * 1000)
})

test("A send notification instruction should use a notification service to send a notification", async () => {
  const email = Email("email")
  const service = NotificationsServiceSpy(email)
  const instruction = SendNotificationInstruction(email, "this is a message")

  expect(service.call()).toBe(0)
  await Effect.runPromise(instruction.execute(ExecutionEnvironment(service.get(), scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))))

  expect(service.call()).toBe(1)
  await Effect.runPromise(instruction.execute(ExecutionEnvironment(service.get(), scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))))
  expect(service.call()).toBe(2)
})

test("A send notification instruction should return an error if the user does not exists", async () => {
  const email = Email("email")
  const service = NotificationsServiceSpy(email)
  const instruction = SendNotificationInstruction(Email("otherEmail"), "this is a message")

  await pipe(
    instruction.execute(ExecutionEnvironment(service.get(), scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(UserNotFoundErrorMock().message + ", " + UserNotFoundErrorMock().cause)
      }
    }),
    Effect.runPromise
  )
})

test("A start task instruction should use a scripts service when executed to find a task to be executed", async () => {
  const task = SpyTaskMock()
  const scriptsServiceSpy = ScriptsServiceSpy(task.get())
  const permissionsService = PermissionsServiceSpy()
  const instruction = StartTaskInstruction(task.get().id)

  await Effect.runPromise(instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceSpy.get(), permissionsService.get(), devicesServiceMock, deviceActionsServiceMock)))
  expect(permissionsService.call()).toBe(0)
  expect(scriptsServiceSpy.call()).toBe(1)
  expect(task.call()).toBe(1)
})

test("A start task instruction should return an error if the task does not exists or if the task returns an error", async () => {
  const task = SpyTaskMock().get()
  const scriptsServiceSpy = ScriptsServiceSpy(task).get()
  const instruction = StartTaskInstruction(TaskId("otherId"))

  const taskFailed = SpyTaskMock(true).get()
  const scriptsServiceSpy2 = ScriptsServiceSpy(taskFailed).get()
  const instruction2 = StartTaskInstruction(taskFailed.id)

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceSpy, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock)),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(ScriptNotFoundError().message + ", " + ScriptNotFoundError().cause)
      }
    }),
    Effect.runPromise
  )

  await pipe(
    instruction2.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceSpy2, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock)),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(ScriptError().message + ", " + ScriptError().cause)
      }
    }),
    Effect.runPromise
  )
})

test("A DeviceActionInstruction should execute an action on a device with a given input", async () => {
  const device = DeviceMock()
  const deviceActionsService = DeviceActionsServiceSpy(device)
  const instruction = DeviceActionInstruction(device.id, device.actions.at(0)!.id, 10)

  await Effect.runPromise(instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsService.get(), TokenMock("email"))))
  expect(deviceActionsService.call()).toBe(1)
})

test("A DeviceActionInstruction should return an error if the execution of the action gives an error", async () => {
  const device = DeviceMock()
  const instruction = DeviceActionInstruction(DeviceId("otherId"), device.actions.at(0)!.id, 10)

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesServiceMock, deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(DeviceNotFoundError().message + ", " + DeviceNotFoundError().cause)
      }
    }),
    Effect.runPromise
  )
})

test("A CreateDevicePropertyConstantInstruction should create a constant with the value of a device property", async () => {
  const device = DeviceMock()
  const devicesService = DevicesServiceSpy(device)
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.IntType, device.id, device.properties.at(0)!.id)

  const env = ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesService.get(), deviceActionsServiceMock, TokenMock("email"))
  const result = await Effect.runPromise(instruction.execute(env))
  expect(result.constants.size).toBe(1)
  expect(env.constants.size).toBe(0)
  expect(devicesService.call()).toBe(1)

  const constant = result.constants.get(instruction);
  expect(constant).toBeDefined();
  expect(constant?.value).toBe<number>(device.properties.at(0)!.value as number)
})

test("A CreateDevicePropertyConstantInstruction execution should return a ScriptError if the device has not been found", async () => {
  const device = DeviceMock()
  const devicesService = DevicesServiceSpy(device)
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.IntType, DeviceId("otherId"), device.properties.at(0)!.id)

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesService.get(), deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(DeviceNotFoundError().message + ", " + DeviceNotFoundError().cause)
      }
    }),
    Effect.runPromise
  )
})

test("A CreateDevicePropertyConstantInstruction execution should return a ScriptError if the property has not been found on the device", async () => {
  const device = DeviceMock()
  const devicesService = DevicesServiceSpy(device)
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.IntType, device.id, DevicePropertyId("otherId"))

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesService.get(), deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(DevicePropertyNotFound().message + `, Property ${DevicePropertyId("otherId")} not found in device ${device.id}`)
      }
    }),
    Effect.runPromise
  )
})

test("A CreateDevicePropertyConstantInstruction execution should return a ScriptError if the type is wrong", async () => {
  const device = DeviceMock()
  const devicesService = DevicesServiceSpy(device)
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.StringType, device.id, device.properties.at(0)!.id)

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceMock, permissionsServiceMock, devicesService.get(), deviceActionsServiceMock, TokenMock("email"))),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(InvalidConstantTypeError().message + ", " + Type.StringType + " is not " + device.properties.at(0)!.typeConstraints.type)
      }
    }),
    Effect.runPromise
  )
})

test("A StartTaskInstruction should return an error if the user trying to execute it does not have the right permissions", async () => {
  const userToken = TokenMock("email")
  const requiredToken = TokenMock("otherEmail")
  const task = SpyTaskMock().get()
  const scriptsServiceSpy = ScriptsServiceSpy(task, true).get()
  const permissionsService = PermissionsServiceSpy(requiredToken)
  const instruction = StartTaskInstruction(TaskId("id"))

  await pipe(
    instruction.execute(ExecutionEnvironment(notificationServiceMock, scriptsServiceSpy, permissionsService.get(), devicesServiceMock, deviceActionsServiceMock, userToken)),
    Effect.match({
      onSuccess() { throw Error("Should not be here") },
      onFailure(err) {
        expect(err.__brand).toBe("ScriptError")
        expect(err.cause).toBe(PermissionError().message + ", " + PermissionError().cause)
      }
    }),
    Effect.runPromise
  )

  expect(permissionsService.call()).toBe(1)
})
