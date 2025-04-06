import { InvalidInputError, DeviceActionError, DeviceActionNotFound } from "../../ports/devices-management/Errors.js";
import { TypeConstraints } from "../../domain/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";
import { Effect } from "effect";

export type DeviceId = Brand<string, "DeviceId">
export type DeviceActionId = Brand<string, "DeviceActionId">
export type DevicePropertyId = Brand<string, "DevicePropertyId">

export function DeviceId(id: string): DeviceId { return id as DeviceId }
export function DeviceActionId(id: string): DeviceActionId { return id as DeviceActionId }
export function DevicePropertyId(id: string): DevicePropertyId { return id as DevicePropertyId }

export enum DeviceStatus {
    Online = "Online",
    Offline = "Offline"
}

export interface Device {
    readonly id: DeviceId;
    name: string;
    readonly address: URL;

    status: DeviceStatus;
    readonly properties: DeviceProperty<unknown>[];
    readonly actions: DeviceAction<unknown>[];
    readonly events: DeviceEvent[];

    executeAction(actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound>;
}

export function Device(
    id: DeviceId,
    name: string,
    address: URL,
    status: DeviceStatus,
    properties: DeviceProperty<unknown>[],
    actions: DeviceAction<unknown>[],
    events: DeviceEvent[]): Device {
    return {
        id: id,
        name: name,
        address: address,
        status: status,
        properties: properties,
        actions: actions,
        events: events,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        executeAction: function (actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound> {
            throw new Error("Function not implemented.");
        }
    }
}


export interface DeviceProperty<T> {
    readonly id: DevicePropertyId;
    readonly name: string;
    value: T;

    readonly setter?: DeviceAction<T>;
    readonly typeConstraints: TypeConstraints<T>;
}

export interface DeviceAction<T> {
    readonly id: DeviceActionId;
    readonly name: string;
    readonly description?: string;

    readonly inputTypeConstraints: TypeConstraints<T>;

    execute(input: T): Effect.Effect<void, InvalidInputError | DeviceActionError>;
}
export function DeviceAction<T>(id: DeviceActionId, name: string, inputTypeConstraints: TypeConstraints<T>, description?: string): DeviceAction<T> {
    return {
        id: id,
        name: name,
        description: description,
        inputTypeConstraints: inputTypeConstraints,
        execute(input) {
            // Don't ask me why validate wants a never, thanks TypeScript
            return this.inputTypeConstraints.validate(input as never).pipe(Effect.mapError(err => InvalidInputError(err.cause)))
            // TODO: actually execute the action on the device
        },
    }
}

export interface DeviceEvent {
    readonly name: string;
}
export function DeviceEvent(name: string): DeviceEvent {
    return { name: name }
}
