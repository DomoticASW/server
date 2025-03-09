import { Maybe } from "option-t/maybe/namespace";
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
    type: Type;
    validate(value: T): Maybe.Maybe<InvalidValueError>;
}
