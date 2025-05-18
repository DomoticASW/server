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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isColor(obj: any): obj is Color {
    return typeof obj == "object" &&
        "r" in obj && typeof obj.r == "number" &&
        "g" in obj && typeof obj.g == "number" &&
        "b" in obj && typeof obj.b == "number"
}

export type TypeConstraints<T> = Enum | IntRange | DoubleRange | None<T>

interface TypeConstraint<T> {
    readonly type: Type;
    validate(value: T): Effect.Effect<void, InvalidValueError>;
}

export interface Enum extends Brand<TypeConstraint<string>, "Enum"> {
    readonly values: Set<string>;
}
class EnumImpl implements Enum {
    values: Set<string>;
    type: Type = Type.StringType;
    __brand: "Enum";

    constructor(values: Set<string>) {
        this.values = values
        this.__brand = "Enum"
    }
    validate(value: string): Effect.Effect<void, InvalidValueError> {
        return Effect.if(this.values.has(value), {
            onTrue: () => Effect.succeed(null),
            onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid, valid values are:\n${Array.from(this.values).join(", ")}`))
        })
    }

}
export function Enum(values: Set<string>): Enum {
    return new EnumImpl(values)
}

export interface IntRange extends Brand<TypeConstraint<number>, "IntRange"> {
    readonly min: number;
    readonly max: number;
}
class IntRangeImpl implements IntRange {
    min: number;
    max: number;
    type: Type = Type.IntType;
    __brand: "IntRange";

    constructor(min: number, max: number) {
        this.min = min
        this.max = max
        this.__brand = "IntRange"
    }

    validate(value: number): Effect.Effect<void, InvalidValueError> {
        return Effect.flatMap(
            Effect.if(Number.isInteger(value), {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid as it's not an integer`))
            }),
            () =>
                Effect.if(value >= this.min && value <= this.max, {
                    onTrue: () => Effect.succeed(null),
                    onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid since it's not between ${this.min} and ${this.max}`))
                })
        )
    }
}
export function IntRange(min: number, max: number): IntRange {
    return new IntRangeImpl(min, max)
}

export interface DoubleRange extends Brand<TypeConstraint<number>, "DoubleRange"> {
    readonly min: number;
    readonly max: number;
}
class DoubleRangeImpl implements DoubleRange {
    min: number;
    max: number;
    type: Type = Type.DoubleType;
    __brand: "DoubleRange";

    constructor(min: number, max: number) {
        this.min = min
        this.max = max
        this.__brand = "DoubleRange"
    }

    validate(value: number): Effect.Effect<void, InvalidValueError> {
        return Effect.if(value >= this.min && value <= this.max, {
            onTrue: () => Effect.succeed(null),
            onFalse: () => Effect.fail(InvalidValueError(`Value ${value} is not valid since it's not between ${this.min} and ${this.max}`))
        })
    }
}
export function DoubleRange(min: number, max: number): DoubleRange {
    return new DoubleRangeImpl(min, max)
}

export type None<T> = Brand<TypeConstraint<T>, "None">
class NoneImpl<T> implements None<T> {
    __brand: "None";
    type: Type;
    constructor(type: Type) {
        this.type = type
        this.__brand = "None"
    }
    validate(): Effect.Effect<void, InvalidValueError> {
        return Effect.succeed(null)
    }
}
export function NoneBoolean(): None<boolean> {
    return new NoneImpl(Type.BooleanType)
}
export function NoneInt(): None<number> {
    return new NoneImpl(Type.IntType)
}
export function NoneDouble(): None<number> {
    return new NoneImpl(Type.DoubleType)
}
export function NoneString(): None<string> {
    return new NoneImpl(Type.StringType)
}
export function NoneColor(): None<Color> {
    return new NoneImpl(Type.ColorType)
}
export function NoneVoid(): None<void> {
    return new NoneImpl(Type.VoidType)
}
