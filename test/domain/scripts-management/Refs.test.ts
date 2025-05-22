import { Condition } from "../../../src/domain/scripts-management/Instruction.js"
import { CreateConstantInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { NumberEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { ConstantRef, ElseNodeRef, RootNodeRef, ThenNodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

test("A ConstantRef can be created", () => {
  const ref: ConstantRef = ConstantRef("constantName", Type.IntType)
  expect(ref.__brand).toBe("ConstantRef")
  expect(ref.name).toBe("constantName")
  expect(ref.type).toBe(Type.IntType)
})

test("A RootNodeRef can be created", () => {
  const ref: RootNodeRef = RootNodeRef()
  expect(ref.__brand).toBe("RootNodeRef")
})

test("A ThenNodeRef can be created", () => {
  const left = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const right = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const ref: ThenNodeRef = ThenNodeRef(1, RootNodeRef(), Condition(left, right, NumberEOperator()))
  expect(ref.__brand).toBe("ThenNodeRef")
})

test("A ElseNodeRef can be created", () => {
  const left = CreateConstantInstruction("constantName1", Type.IntType, 15)
  const right = CreateConstantInstruction("constantName2", Type.IntType, 10)
  const ref: ElseNodeRef = ElseNodeRef(1, RootNodeRef(), Condition(left, right, NumberEOperator()))
  expect(ref.__brand).toBe("ElseNodeRef")
})
