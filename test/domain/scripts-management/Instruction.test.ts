import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js"
import { Color } from "../../../src/domain/devices-management/Types.js"
import { ConstantValue, ExecutionEnvironment, ExecutionEnvironmentFromConstants } from "../../../src/domain/scripts-management/Instruction.js"
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { ColorEOperator, NumberEOperator, NumberGEOperator, NumberGOperator, NumberLEOperator, NumberLOperator, StringEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

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

test("A create constant instruction add a value to the env when executed", () => {
  const instruction = CreateConstantInstruction("constantName", Type.IntType, 10)
  const env = ExecutionEnvironment()
  expect(instruction.execute(env).constants.size).toBe(1)
  expect(env.constants.size).toBe(0)

  const constant = instruction.execute(env).constants.get(instruction);
  expect(constant).toBeDefined();
  expect(constant?.value).toBe(10);
})

test("A create device property constant instruction can be created", () => {
  const instruction = CreateDevicePropertyConstantInstruction("constantName", Type.IntType, DeviceId("deviceId"), DevicePropertyId("devicePropertyId"))
  expect(instruction.name).toBe("constantName")
  expect(instruction.type).toBe(Type.IntType)
  expect(instruction.deviceId).toBe("deviceId")
  expect(instruction.devicePropertyId).toBe("devicePropertyId")
})

test("A number equals operator makes a check of equality on numbers", () => {
  const condition = NumberEOperator()
  const left = ConstantValue(10)

  const right1 = ConstantValue(10)
  const right2 = ConstantValue(5)
  
  expect(condition.evaluate(left, right1)).toBe(true)
  expect(condition.evaluate(left, right2)).toBe(false)
})

test("A number greater equals operator makes a check of greater/equality on numbers", () => {
  const condition = NumberGEOperator()
  const left = ConstantValue(10)

  const right1 = ConstantValue(10)
  const right2 = ConstantValue(5)
  const right3 = ConstantValue(15)

  expect(condition.evaluate(left, right1)).toBe(true)
  expect(condition.evaluate(left, right2)).toBe(true)
  expect(condition.evaluate(left, right3)).toBe(false)
})

test("A number less equals operator makes a check of less/equality on numbers", () => {
  const condition = NumberLEOperator()
  const left = ConstantValue(10)

  const right1 = ConstantValue(10)
  const right2 = ConstantValue(5)
  const right3 = ConstantValue(15)

  expect(condition.evaluate(left, right1)).toBe(true)
  expect(condition.evaluate(left, right2)).toBe(false)
  expect(condition.evaluate(left, right3)).toBe(true)
})

test("A number less operator makes a check of less on numbers", () => {
  const condition = NumberLOperator()
  const left = ConstantValue(10)

  const right1 = ConstantValue(10)
  const right2 = ConstantValue(15)

  expect(condition.evaluate(left, right1)).toBe(false)
  expect(condition.evaluate(left, right2)).toBe(true)
})

test("A number greater operator makes a check of greater on numbers", () => {
  const condition = NumberGOperator()
  const left = ConstantValue(10)

  const right1 = ConstantValue(10)
  const right2 = ConstantValue(5)

  expect(condition.evaluate(left, right1)).toBe(false)
  expect(condition.evaluate(left, right2)).toBe(true)
})

test("A string equal operator makes a check of equality between strings", () => {
  const condition = StringEOperator()
  const left = ConstantValue("ciao")
  const right1 = ConstantValue("ciao")
  const right2 = ConstantValue("ciao1")

  expect(condition.evaluate(left, right1)).toBe(true)
  expect(condition.evaluate(left, right2)).toBe(false)
})

test("A color equal operator makes a check of equality between colors", () => {
  const condition = ColorEOperator()
  const left = ConstantValue(Color(10, 10, 10))
  const right1 = ConstantValue(Color(10, 10, 10))
  const right2 = ConstantValue(Color(11, 10, 10))
  const right3 = ConstantValue(Color(10, 11, 10))
  const right4 = ConstantValue(Color(10, 10, 11))

  expect(condition.evaluate(left, right1)).toBe(true)
  expect(condition.evaluate(left, right2)).toBe(false)
  expect(condition.evaluate(left, right3)).toBe(false)
  expect(condition.evaluate(left, right4)).toBe(false)
})