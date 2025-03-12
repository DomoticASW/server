import { Result } from "option-t/plain_result/namespace";
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
    readonly type: Type;
    validate(value: T): Result.Result<undefined, InvalidValueError>;
}
