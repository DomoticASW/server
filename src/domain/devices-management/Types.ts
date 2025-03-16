import { TypeConstraints } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js"

// This is an implementation, should do this using TDD
// abstract class TypeConstraintsImpl<T> implements TypeConstraints<T> {
//     readonly type: Type;

//     constructor(type: Type) {
//         this.type = type
//     }

//     validate(value: T): Result.Result<undefined, InvalidValueError> {
//         switch (this.type) {
//             case Type.IntType:
//                 if (!Number.isInteger(value)) {
//                     return Result.createErr(new InvalidValueError())
//                 }
//                 break;
//             case Type.DoubleType:
//                 if (!(typeof value === 'number')) {
//                     return Result.createErr(new InvalidValueError())
//                 }
//                 break;
//             case Type.BooleanType:
//                 if (!(typeof value === 'boolean')) {
//                     return Result.createErr(new InvalidValueError())
//                 }
//                 break;
//             case Type.ColorType:
//                 // TODO: check is rgb
//                 if (!(typeof value === 'string')) {
//                     return Result.createErr(new InvalidValueError())
//                 }
//                 break;
//             case Type.StringType:
//                 if (!(typeof value === 'string')) {
//                     return Result.createErr(new InvalidValueError())
//                 }
//                 break;
//             case Type.VoidType:
//                 if (!(value === null || value === undefined)) {
//                     return Result.createErr(new InvalidValueError())
//                 }
//                 break;
//         }
//         return Result.createOk(undefined)
//     }
// }

export interface Enum extends Brand<TypeConstraints<string>, Enum> {
    readonly values: Set<string>;
}

export interface IntRange extends Brand<TypeConstraints<number>, "IntRange"> {
    readonly min: number;
    readonly max: number;
}

export interface DoubleRange extends Brand<TypeConstraints<number>, "DoubleRange"> {
    readonly min: number;
    readonly max: number;
}

export type None<T> = Brand<TypeConstraints<T>, "None">
