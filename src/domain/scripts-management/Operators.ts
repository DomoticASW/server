import { ConditionOperator } from "./Instruction.js";

export function NumberEOperator(): ConditionOperator<number> {
  return {
    evaluate(left, right) {
      return left.value == right.value
    },
  }
}

export function NumberGEOperator(): ConditionOperator<number> {
  return {
    evaluate(left, right) {
      return left.value >= right.value
    },
  }
}

export function NumberLEOperator(): ConditionOperator<number> {
  return {
    evaluate(left, right) {
      return left.value <= right.value
    },
  }
}