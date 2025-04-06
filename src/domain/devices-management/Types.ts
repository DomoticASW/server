import { Effect } from "effect";
import { InvalidValueError } from "../../ports/devices-management/Errors.js";
import { Type } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";

export interface Color {
    readonly r: number
    readonly g: number
    readonly b: number
}
export function Color(r: number, g: number, b: number): Color {
    if (r < 0) { r = 0 }
    if (g < 0) { g = 0 }
    if (b < 0) { b = 0 }
    if (r > 255) { r = 255 }
    if (g > 255) { g = 255 }
    if (b > 255) { b = 255 }
    return { r, g, b }
}

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
export function IntRange(min: number, max: number): IntRange {
    return {
        __brand: "IntRange", type: Type.IntType, min: min, max: max, validate(value) {
            return Effect.flatMap(
                Effect.if(Number.isInteger(value), {
                    onTrue: () => Effect.succeed(null),
                    onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid as it's not an integer`))
                }),
                () =>
                    Effect.if(value >= min && value <= max, {
                        onTrue: () => Effect.succeed(null),
                        onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid since it's not between ${min} and ${max}`))
                    })
            )
        }
    }
}

export interface DoubleRange extends Brand<TypeConstraint<number>, "DoubleRange"> {
    readonly min: number;
    readonly max: number;
}
export function DoubleRange(min: number, max: number): DoubleRange {
    return {
        __brand: "DoubleRange", type: Type.IntType, min: min, max: max, validate(value) {
            return Effect.if(value >= min && value <= max, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid since it's not between ${min} and ${max}`))
            })
        }
    }
}

export type None<T> = Brand<TypeConstraint<T>, "None">
function None<T>(type: Type): None<T> {
    return {
        __brand: "None", type: type, validate: () => Effect.succeed(null),
    }
}
export function NoneBoolean(): None<boolean> {
    return None(Type.BooleanType)
}
export function NoneInt(): None<number> {
    return None(Type.IntType)
}
export function NoneDouble(): None<number> {
    return None(Type.DoubleType)
}
export function NoneString(): None<string> {
    return None(Type.StringType)
}
export function NoneColor(): None<Color> {
    return None(Type.ColorType)
}
export function NoneVoid(): None<void> {
    return None(Type.VoidType)
}
