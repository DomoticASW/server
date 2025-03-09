import { InvalidValueError } from "../../ports/devices-management/Errors.js";
import { TypeConstraints, Type } from "../../ports/devices-management/Types.js";
import { Maybe } from "option-t/maybe/namespace";

abstract class TypeConstraintsImpl<T> implements TypeConstraints<T> {
    type: Type;

    constructor(type: Type) {
        this.type = type
    }

    validate(value: T): Maybe.Maybe<InvalidValueError> {
        switch (this.type) {
            case Type.IntType:
                if (!Number.isInteger(value)) {
                    return new InvalidValueError()
                }
                break;
            case Type.DoubleType:
                if (!(typeof value === 'number')) {
                    return new InvalidValueError()
                }
                break;
            case Type.BooleanType:
                if (!(typeof value === 'boolean')) {
                    return new InvalidValueError()
                }
                break;
            case Type.ColorType:
                // TODO: check is rgb
                if (!(typeof value === 'string')) {
                    return new InvalidValueError()
                }
                break;
            case Type.StringType:
                if (!(typeof value === 'string')) {
                    return new InvalidValueError()
                }
                break;
            case Type.VoidType:
                if (!(value === null || value === undefined)) {
                    return new InvalidValueError()
                }
                break;
        }
    }
}

export class Enum extends TypeConstraintsImpl<string> {
    values: Set<string>;

    constructor(values: Set<string>) {
        super(Type.StringType)
        this.values = values
    }

    validate(value: string): Maybe.Maybe<InvalidValueError> {
        return Maybe.orElse(super.validate(value), () => {
            if (!this.values.has(value)) {
                return new InvalidValueError()
            }
        })
    }
}

export class IntRange extends TypeConstraintsImpl<number> {
    min: number;
    max: number;

    constructor(min: number, max: number) {
        super(Type.IntType)
        this.min = min
        this.max = max
    }

    validate(value: number): Maybe.Maybe<InvalidValueError> {
        return Maybe.orElse(super.validate(value), () => {
            if (value < this.min || value > this.max) {
                return new InvalidValueError()
            }
        })
    }
}

export class DoubleRange extends TypeConstraintsImpl<number> {
    min: number;
    max: number;

    constructor(min: number, max: number) {
        super(Type.DoubleType)
        this.min = min
        this.max = max
    }

    validate(value: number): Maybe.Maybe<InvalidValueError> {
        return Maybe.orElse(super.validate(value), () => {
            if (value < this.min || value > this.max) {
                return new InvalidValueError()
            }
        })
    }
}

export class None<T> extends TypeConstraintsImpl<T> {
    constructor(type: Type) {
        super(type)
    }

    validate(value: T): Maybe.Maybe<InvalidValueError> {
        return super.validate(value)
    }
}

