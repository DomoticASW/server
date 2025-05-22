import { Condition } from "../../../src/domain/scripts-management/Instruction.js"
import { CreateConstantInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { NumberEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { ConstantRef, ElseNodeRef, RootNodeRef, ThenNodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

test("A ConstantRef can be created", () => {
  const instruction = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const scopeNode = RootNodeRef()
  const ref: ConstantRef = ConstantRef(instruction, scopeNode)
  expect(ref.__brand).toBe("ConstantRef")
  expect(ref.scopeNode).toBe(scopeNode)
  expect(ref.constantInstruction).toBe(instruction)
})

test("A RootNodeRef can be created", () => {
  const ref: RootNodeRef = RootNodeRef()
  expect(ref.__brand).toBe("RootNodeRef")
  expect(ref.scopeLevel).toBe(0)
  expect(ref.superNode).toBe(ref)
})

test("A ThenNodeRef can be created", () => {
  const left = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const right = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const condition = Condition(left, right, NumberEOperator())
  const superNode = RootNodeRef()
  const ref: ThenNodeRef = ThenNodeRef(1, superNode, condition)
  expect(ref.__brand).toBe("ThenNodeRef")
  expect(ref.scopeLevel).toBe(1)
  expect(ref.superNode).toBe(superNode)
  expect(ref.condition).toBe(condition)
})

test("A ElseNodeRef can be created", () => {
  const left = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const right = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const condition = Condition(left, right, NumberEOperator())
  const superNode = RootNodeRef()
  const ref: ElseNodeRef = ElseNodeRef(1, superNode, condition)
  expect(ref.__brand).toBe("ElseNodeRef")
  expect(ref.scopeLevel).toBe(1)
  expect(ref.superNode).toBe(superNode)
  expect(ref.condition).toBe(condition)
})
