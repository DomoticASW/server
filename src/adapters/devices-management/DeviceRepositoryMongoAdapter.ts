import mongoose, { Document, Model } from "mongoose";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus } from "../../domain/devices-management/Device.js";
import { BaseRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapter.js";
import { DoubleRange, Enum, IntRange, NoneBoolean, NoneColor, NoneDouble, NoneInt, NoneString, NoneVoid, TypeConstraints } from "../../domain/devices-management/Types.js";
import { Type } from "../../ports/devices-management/Types.js";

export interface DeviceSchema {
    _id: string
    name: string
    address: string
    status: string
    properties: DevicePropertySchema[]
    actions: DeviceActionSchema[]
    events: string[]
}

interface DevicePropertySchema {
    id: string;
    name: string;
    value: unknown;
    setter?: DeviceActionSchema;
    typeConstraints: TypeConstraintSchema;
}

interface DeviceActionSchema {
    id: string
    name: string
    description?: string
    inputTypeConstraints: TypeConstraintSchema
}

interface TypeConstraintSchema {
    __brand: string
    type: string
    // Enum
    values?: string[]
    // IntRange/DoubleRange
    min?: number
    max?: number
}

export class DeviceRepositoryMongoAdapter extends BaseRepositoryMongoAdapter<DeviceId, Device, string, DeviceSchema> {
    private typeConstraintSchema = new mongoose.Schema<TypeConstraintSchema>({
        __brand: { type: String, required: true },
        type: { type: String, enum: Type, required: true },
        values: { type: [String], required: false },
        min: { type: Number, required: false },
        max: { type: Number, required: false }
    });
    private deviceActionSchema = new mongoose.Schema<DeviceActionSchema>({
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: false },
        inputTypeConstraints: { type: this.typeConstraintSchema, required: true }
    });
    private devicePropertySchema = new mongoose.Schema<DevicePropertySchema>({
        id: { type: String, required: true },
        name: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
        setter: { type: this.deviceActionSchema, required: false },
        typeConstraints: { type: this.typeConstraintSchema, required: true }
    });
    private deviceSchema = new mongoose.Schema<DeviceSchema>({
        _id: { type: String, required: true },
        name: { type: String, required: true },
        address: { type: String, required: true },
        status: { type: String, enum: DeviceStatus, required: true },
        properties: { type: [this.devicePropertySchema], required: true },
        actions: { type: [this.deviceActionSchema], required: true },
        events: { type: [String], required: true }
    });
    private Device: mongoose.Model<DeviceSchema>

    constructor(connection: mongoose.Connection) {
        super(connection)
        this.Device = connection.model("Device", this.deviceSchema, undefined, { overwriteModels: true })
    }

    private devicePropertyToSchema(p: DeviceProperty<unknown>): DevicePropertySchema {
        const setter = p.setter ? this.deviceActionToSchema(p.setter) : undefined
        return {
            id: p.id,
            name: p.name,
            value: p.value,
            setter: setter,
            typeConstraints: this.typeConstraintToSchema(p.typeConstraints)
        }
    }

    private devicePropertyFromSchema(s: DevicePropertySchema): DeviceProperty<unknown> {
        const setterOrTypeConstraints = s.setter ? this.deviceActionFromSchema(s.setter) : this.typeConstraintFromSchema(s.typeConstraints)
        return DeviceProperty(DevicePropertyId(s.id), s.name, s.value, setterOrTypeConstraints)
    }

    private deviceActionToSchema(a: DeviceAction<unknown>): DeviceActionSchema {
        return {
            id: a.id,
            name: a.name,
            description: a.description,
            inputTypeConstraints: this.typeConstraintToSchema(a.inputTypeConstraints)
        }
    }

    private deviceActionFromSchema(s: DeviceActionSchema): DeviceAction<unknown> {
        return DeviceAction(DeviceActionId(s.id), s.name, this.typeConstraintFromSchema(s.inputTypeConstraints), s.description)
    }

    private typeConstraintToSchema(tc: TypeConstraints<unknown>): TypeConstraintSchema {
        let min: number | undefined
        let max: number | undefined
        let values: string[] | undefined
        switch (tc.__brand) {
            case "DoubleRange":
            case "IntRange":
                min = tc.min
                max = tc.max
                break
            case "Enum":
                values = Array.from(tc.values)
                break
            default:
                break;
        }
        return {
            __brand: tc.__brand,
            type: tc.type,
            min: min,
            max: max,
            values: values
        }
    }

    private typeConstraintFromSchema(s: TypeConstraintSchema): TypeConstraints<unknown> {
        switch (s.__brand as "None" | "Enum" | "IntRange" | "DoubleRange") {
            case "None":
                switch (s.type as Type) {
                    case Type.IntType:
                        return NoneInt()
                    case Type.DoubleType:
                        return NoneDouble()
                    case Type.BooleanType:
                        return NoneBoolean()
                    case Type.StringType:
                        return NoneString()
                    case Type.ColorType:
                        return NoneColor()
                    case Type.VoidType:
                        return NoneVoid()
                }
                break;
            case "Enum":
                return Enum(new Set(s.values))
            case "IntRange":
                return IntRange(s.min!, s.max!)
            case "DoubleRange":
                return DoubleRange(s.min!, s.max!)
        }
    }

    protected toDocument(e: Device): Document<unknown, object, DeviceSchema> & DeviceSchema {
        const properties: DevicePropertySchema[] = e.properties.map(p => this.devicePropertyToSchema(p))
        const actions: DeviceActionSchema[] = e.actions.map(a => this.deviceActionToSchema(a))
        const events = e.events.map(e => e.name)
        return new this.Device({ _id: e.id, name: e.name, address: e.address.toString(), status: e.status, properties: properties, actions: actions, events: events })
    }
    protected toEntity(s: DeviceSchema): Device {
        const properties = s.properties.map(p => this.devicePropertyFromSchema(p))
        const actions = s.actions.map(a => this.deviceActionFromSchema(a))
        const events = s.events.map(e => DeviceEvent(e))
        return Device(DeviceId(s._id), s.name, new URL(s.address), s.status as DeviceStatus, properties, actions, events)
    }
    protected model(): Model<DeviceSchema> {
        return this.Device
    }
}
