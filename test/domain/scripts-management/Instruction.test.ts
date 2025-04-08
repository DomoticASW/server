import { DeviceActionId, DeviceId } from "../../../src/domain/devices-management/Device.js"
import { ConstantValue, ExecutionEnvironment, ExecutionEnvironmentFromConstants } from "../../../src/domain/scripts-management/Instruction.js"
import { CreateConstantInstruction, DeviceActionInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
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
  const instruction = DeviceActionInstruction(DeviceId("deviceId"), DeviceActionId("actionId"), 10)
  expect(instruction.deviceId).toBe("deviceId")
  expect(instruction.actionId).toBe("actionId")
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