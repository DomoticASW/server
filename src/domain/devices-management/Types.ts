import { InvalidValueError } from "../../ports/devices-management/Errors.js";
import { TypeConstraints, Type } from "../../ports/devices-management/Types.js";
import { Result } from "option-t/plain_result/namespace";

abstract class TypeConstraintsImpl<T> implements TypeConstraints<T> {
    readonly type: Type;

    constructor(type: Type) {
        this.type = type
    }

    validate(value: T): Result.Result<undefined, InvalidValueError> {
        switch (this.type) {
            case Type.IntType:
                if (!Number.isInteger(value)) {
                    return Result.createErr(new InvalidValueError())
                }
                break;
            case Type.DoubleType:
                if (!(typeof value === 'number')) {
                    return Result.createErr(new InvalidValueError())
                }
                break;
            case Type.BooleanType:
                if (!(typeof value === 'boolean')) {
                    return Result.createErr(new InvalidValueError())
                }
                break;
            case Type.ColorType:
                // TODO: check is rgb
                if (!(typeof value === 'string')) {
                    return Result.createErr(new InvalidValueError())
                }
                break;
            case Type.StringType:
                if (!(typeof value === 'string')) {
                    return Result.createErr(new InvalidValueError())
                }
                break;
            case Type.VoidType:
                if (!(value === null || value === undefined)) {
                    return Result.createErr(new InvalidValueError())
                }
                break;
        }
        return Result.createOk(undefined)
    }
}

export class Enum extends TypeConstraintsImpl<string> {
    readonly values: Set<string>;

    constructor(values: Set<string>) {
        super(Type.StringType)
        this.values = values
    }

    validate(value: string): Result.Result<undefined, InvalidValueError> {
        return Result.andThen(super.validate(value), () => {
            if (!this.values.has(value)) {
                return Result.createErr(new InvalidValueError())
            }
            return Result.createOk(undefined)
        })
    }
}

export class IntRange extends TypeConstraintsImpl<number> {
    readonly min: number;
    readonly max: number;

    constructor(min: number, max: number) {
        super(Type.IntType)
        this.min = min
        this.max = max
    }

    validate(value: number): Result.Result<undefined, InvalidValueError> {
        return Result.andThen(super.validate(value), () => {
            if (value < this.min || value > this.max) {
                return Result.createErr(new InvalidValueError())
            }
            return Result.createOk(undefined)
        })
    }
}

export class DoubleRange extends TypeConstraintsImpl<number> {
    readonly min: number;
    readonly max: number;

    constructor(min: number, max: number) {
        super(Type.DoubleType)
        this.min = min
        this.max = max
    }

    validate(value: number): Result.Result<undefined, InvalidValueError> {
        return Result.andThen(super.validate(value), () => {
            if (value < this.min || value > this.max) {
                return Result.createErr(new InvalidValueError())
            }
            return Result.createOk(undefined)
        })
    }
}

export class None<T> extends TypeConstraintsImpl<T> {
    constructor(type: Type) {
        super(type)
    }

    validate(value: T): Result.Result<undefined, InvalidValueError> {
        return super.validate(value)
    }
}

