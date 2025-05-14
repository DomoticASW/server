import { Brand } from "../../utils/Brand.js";
import { Color } from "../devices-management/Types.js";
import { ConditionOperator } from "./Instruction.js";

function EqualOperator<T>(): ConditionOperator<T> {
  return {
    evaluate(left, right) {
      return left.value == right.value
    }
  }
}

export function NumberEOperator(): Brand<ConditionOperator<number>, "NumberEOperator"> {
  return {
    __brand: "NumberEOperator",
    evaluate: EqualOperator().evaluate
  }
}

export function NumberGEOperator(): Brand<ConditionOperator<number>, "NumberGEOperator"> {
  return {
    __brand: "NumberGEOperator",
    evaluate(left, right) {
      return left.value >= right.value
    },
  }
}

export function NumberLEOperator(): Brand<ConditionOperator<number>, "NumberLEOperator"> {
  return {
    __brand: "NumberLEOperator",
    evaluate(left, right) {
      return left.value <= right.value
    },
  }
}

export function NumberLOperator(): Brand<ConditionOperator<number>, "NumberLOperator"> {
  return {
    __brand: "NumberLOperator",
    evaluate(left, right) {
      return left.value < right.value
    },
  }
}

export function NumberGOperator(): Brand<ConditionOperator<number>, "NumberGOperator"> {
  return {
    __brand: "NumberGOperator",
    evaluate(left, right) {
      return left.value > right.value
    },
  }
}

export function StringEOperator(): Brand<ConditionOperator<string>, "StringEOperator"> {
  return {
    __brand: "StringEOperator",
    evaluate: EqualOperator().evaluate
  }
}

export function ColorEOperator(): Brand<ConditionOperator<Color>, "ColorEOperator"> {
  return {
    __brand: "ColorEOperator",
    evaluate(left, right) {
      return left.value.r == right.value.r &&
        left.value.b == right.value.b &&
        left.value.g == right.value.g
    },
  }
}

export function BooleanEOperator(): Brand<ConditionOperator<boolean>, "BooleanEOperator"> {
  return {
    __brand: "BooleanEOperator",
    evaluate: EqualOperator().evaluate
  }
}
