import { Effect } from "effect";
import { InvalidValueError } from "../../ports/devices-management/Errors.js";
import { Type } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";

export type TypeConstraints<T> = Enum | IntRange | DoubleRange | None<T>

interface TypeConstraint<T> {
    readonly type: Type;
    validate(value: T): Effect.Effect<void, InvalidValueError>;
}

export interface Enum extends Brand<TypeConstraint<string>, "Enum"> {
    readonly values: Set<string>;
}
export function Enum(values: Set<string>): Enum {
    return {
        __brand: "Enum", type: Type.StringType, values: values, validate(value) {
            return Effect.if(values.has(value), {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid, valid values are:\n${Array.from(values).join(", ")}`))
            })
        }
    }
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
