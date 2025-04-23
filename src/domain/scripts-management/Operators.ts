import { Color } from "../devices-management/Types.js";
import { ConditionOperator } from "./Instruction.js";

function EqualOperator<T>() : ConditionOperator<T> {
  return {
    evaluate(left, right) {
      return left.value == right.value
    }
  }
}

export function NumberEOperator(): ConditionOperator<number> {
  return EqualOperator()
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

export function NumberLOperator(): ConditionOperator<number> {
  return {
    evaluate(left, right) {
      return left.value < right.value
    },
  }
}

export function NumberGOperator(): ConditionOperator<number> {
  return {
    evaluate(left, right) {
      return left.value > right.value
    },
  }
}

export function StringEOperator(): ConditionOperator<string> {
  return EqualOperator()
}

export function ColorEOperator(): ConditionOperator<Color> {
  return {
    evaluate(left, right) {
      return left.value.r == right.value.r &&
              left.value.b == right.value.b && 
              left.value.g == right.value.g
    },
  }
}

export function BooleanEOperator(): ConditionOperator<boolean> {
  return EqualOperator()
}
