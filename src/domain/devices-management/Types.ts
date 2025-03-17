import { Result } from "option-t/plain_result";
import { InvalidValueError } from "../../ports/devices-management/Errors.js";
import { Type } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";

export type TypeConstraints<T> = Enum | IntRange | DoubleRange | None<T>

interface TypeConstraint<T> {
    readonly type: Type;
    validate(value: T): Result<undefined, InvalidValueError>;
}

export interface Enum extends Brand<TypeConstraint<string>, "Enum"> {
    readonly values: Set<string>;
}

export interface IntRange extends Brand<TypeConstraint<number>, "IntRange"> {
    readonly min: number;
    readonly max: number;
}

export interface DoubleRange extends Brand<TypeConstraint<number>, "DoubleRange"> {
    readonly min: number;
    readonly max: number;
}

export type None<T> = Brand<TypeConstraint<T>, "None">
