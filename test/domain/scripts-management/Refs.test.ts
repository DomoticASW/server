import { ConstantRef, ElseNodeRef, RootNodeRef, ThenNodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

test("A ConstantRef can be created", () => {
  const ref: ConstantRef = ConstantRef("constantName", Type.IntType)
  expect(ref.__brand).toBe("ConstantRef")
  expect(ref.name).toBe("constantName")
  expect(ref.type).toBe(Type.IntType)
})

test("A RootNodeRef can be created", () => {
  const ref: RootNodeRef = RootNodeRef("name")
  expect(ref.__brand).toBe("RootNodeRef")
  expect(ref.name).toBe("name")
})

test("A ThenNodeRef can be created", () => {
  const ref: ThenNodeRef = ThenNodeRef("name")
  expect(ref.__brand).toBe("ThenNodeRef")
  expect(ref.name).toBe("name")
})

test("A ElseNodeRef can be created", () => {
  const ref: ElseNodeRef = ElseNodeRef("name")
  expect(ref.__brand).toBe("ElseNodeRef")
  expect(ref.name).toBe("name")
})
