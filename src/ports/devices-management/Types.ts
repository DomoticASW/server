import { InvalidValueError } from "./Errors.js";

export enum Type {
    IntType = "IntType",
    DoubleType = "DoubleType",
    BooleanType = "BooleanType",
    ColorType = "ColorType",
    StringType = "StringType",
    VoidType = "VoidType"
}

export interface TypeConstraints<T> {
    validate(value: T): InvalidValueError | undefined;
}

export interface Enum extends TypeConstraints<string> {
    values: Set<string>;
}

export interface IntRange extends TypeConstraints<number> {
    min: number;
    max: number;
}

export interface DoubleRange extends TypeConstraints<number> {
    min: number;
    max: number;
}

export type None<T> = TypeConstraints<T>
