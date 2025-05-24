import { Color } from "../devices-management/Types.js";
import { ConditionOperator, ConstantValue } from "./Instruction.js";

function EqualOperator<T>(): ConditionOperator<T> {
  return {
    evaluate(left, right) {
      return left.value == right.value
    }
  }
}


export function NumberEOperator(): ConditionOperator<number> {
  return new NumberEOperatorImpl()
}
class NumberEOperatorImpl implements ConditionOperator<number> {
  constructor() { }
  evaluate(left: ConstantValue<number>, right: ConstantValue<number>): boolean {
    return EqualOperator().evaluate(left, right)
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumberEOperator(o: any): boolean {
  return typeof o == "object" && o instanceof NumberEOperatorImpl
}


export function NumberGEOperator(): ConditionOperator<number> {
  return new NumberGEOperatorImpl()
}
class NumberGEOperatorImpl implements ConditionOperator<number> {
  constructor() { }
  evaluate(left: ConstantValue<number>, right: ConstantValue<number>): boolean {
    return left.value >= right.value
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumberGEOperator(o: any): boolean {
  return typeof o == "object" && o instanceof NumberGEOperatorImpl
}


export function NumberLEOperator(): ConditionOperator<number> {
  return new NumberLEOperatorImpl()
}
class NumberLEOperatorImpl implements ConditionOperator<number> {
  constructor() { }
  evaluate(left: ConstantValue<number>, right: ConstantValue<number>): boolean {
    return left.value <= right.value
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumberLEOperator(o: any): boolean {
  return typeof o == "object" && o instanceof NumberLEOperatorImpl
}


export function NumberLOperator(): ConditionOperator<number> {
  return new NumberLOperatorImpl()
}
class NumberLOperatorImpl implements ConditionOperator<number> {
  constructor() { }
  evaluate(left: ConstantValue<number>, right: ConstantValue<number>): boolean {
    return left.value < right.value
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumberLOperator(o: any): boolean {
  return typeof o == "object" && o instanceof NumberLOperatorImpl
}


export function NumberGOperator(): ConditionOperator<number> {
  return new NumberGOperatorImpl()
}
class NumberGOperatorImpl implements ConditionOperator<number> {
  constructor() { }
  evaluate(left: ConstantValue<number>, right: ConstantValue<number>): boolean {
    return left.value > right.value
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumberGOperator(o: any): boolean {
  return typeof o == "object" && o instanceof NumberGOperatorImpl
}


export function StringEOperator(): ConditionOperator<string> {
  return new StringEOperatorImpl()
}
class StringEOperatorImpl implements ConditionOperator<string> {
  constructor() { }
  evaluate(left: ConstantValue<string>, right: ConstantValue<string>): boolean {
    return EqualOperator().evaluate(left, right)
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isStringEOperator(o: any): boolean {
  return typeof o == "object" && o instanceof StringEOperatorImpl
}


export function ColorEOperator(): ConditionOperator<Color> {
  return new ColorEOperatorImpl()
}
class ColorEOperatorImpl implements ConditionOperator<Color> {
  constructor() { }
  evaluate(left: ConstantValue<Color>, right: ConstantValue<Color>): boolean {
    return left.value.r == right.value.r &&
      left.value.b == right.value.b &&
      left.value.g == right.value.g
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isColorEOperator(o: any): boolean {
  return typeof o == "object" && o instanceof ColorEOperatorImpl
}


export function BooleanEOperator(): ConditionOperator<boolean> {
  return new BooleanEOperatorImpl()
}
class BooleanEOperatorImpl implements ConditionOperator<boolean> {
  constructor() { }
  evaluate(left: ConstantValue<boolean>, right: ConstantValue<boolean>): boolean {
    return EqualOperator().evaluate(left, right)
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBooleanEOperator(o: any): boolean {
  return typeof o == "object" && o instanceof BooleanEOperatorImpl
}
