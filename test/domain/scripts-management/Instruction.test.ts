import { Effect } from "effect"
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js"
import { Condition, ConstantValue, ExecutionEnvironment, ExecutionEnvironmentFromConstants } from "../../../src/domain/scripts-management/Instruction.js"
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, ElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { NumberGOperator, NumberLEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { DevicesServiceMock, NotificationsServiceMock, ScriptsServiceMock } from "./mocks.js"

test("An execution environment can be created", () => {
  const env = ExecutionEnvironment()
  expect(env.constants.size).toBe(0)
})

test("An execution environment can be created with values", () => {
  const env = ExecutionEnvironment()
  const env2 = ExecutionEnvironmentFromConstants(env.constants)
  expect(env2.constants.size).toBe(env.constants.size)
  expect(env2.constants).not.toBe(env.constants)
})

test("A constant value can be created", () => {
  const value = ConstantValue(10)
  expect(value.value).toBe(10)
})

test("A send notification instruction can be created", () => {
  const instruction = SendNotificationInstruction(Email("email"), "this is a message", NotificationsServiceMock())
  expect(instruction.email).toBe("email")
  expect(instruction.message).toBe("this is a message")
})

test("A wait instruction can be created", () => {
  const instruction = WaitInstruction(1)
  expect(instruction.seconds).toBe(1)
})

test("A start task instruction can be created", () => {
  const instruction = StartTaskInstruction(TaskId("1"), ScriptsServiceMock())
  expect(instruction.taskId).toBe("1")
})

test("A device action instruction can be created", () => {
  const instruction = DeviceActionInstruction(DeviceId("deviceId"), DeviceActionId("deviceActionId"), 10, DevicesServiceMock())
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
  const env = ExecutionEnvironment()
  const result = await Effect.runPromise(instruction.execute(env))
  expect(result.constants.size).toBe(1)
  expect(env.constants.size).toBe(0)

  const constant = result.constants.get(instruction);
  expect(constant).toBeDefined();
  expect(constant?.value).toBe(10);
})

test("A create device property constant instruction can be created", () => {
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.IntType, DeviceId("deviceId"), DevicePropertyId("devicePropertyId"), DevicesServiceMock())
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

  const env = ExecutionEnvironment()
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

  const env = ExecutionEnvironment()
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
  
  const setupEnv = ExecutionEnvironment()
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
  
  const setupEnv = ExecutionEnvironment()
  const env = await Effect.runPromise(right.execute(await Effect.runPromise(left.execute(setupEnv))))
  
  const elseIfInstruction = ElseInstruction(thenInstructions, elseInstructions, condition)
  const falseElseIfInstruction = ElseInstruction(thenInstructions, elseInstructions, negatedCondition)

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
  await Effect.runPromise(instruction.execute(ExecutionEnvironment()))
  expect(Date.now()).toBeGreaterThan(start + 0.999 * 1000)
})