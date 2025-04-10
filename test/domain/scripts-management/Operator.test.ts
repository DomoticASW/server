import { Color } from "../../../src/domain/devices-management/Types.js"
import { ConstantValue } from "../../../src/domain/scripts-management/Instruction.js"
import { NumberEOperator, NumberGEOperator, NumberLEOperator, NumberLOperator, NumberGOperator, StringEOperator, ColorEOperator } from "../../../src/domain/scripts-management/Operators.js"

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