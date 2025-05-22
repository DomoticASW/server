import { CreateConstantInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
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
})

test("A ThenNodeRef can be created", () => {
  const ref: ThenNodeRef = ThenNodeRef()
  expect(ref.__brand).toBe("ThenNodeRef")
})

test("A ElseNodeRef can be created", () => {
  const ref: ElseNodeRef = ElseNodeRef()
  expect(ref.__brand).toBe("ElseNodeRef")
})
