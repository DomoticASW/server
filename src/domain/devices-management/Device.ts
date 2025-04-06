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
        executeAction: function (actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound> {
            const action = actions.find(a => a.id === actionId)
            if (action) {
                return action.execute(input)
            } else {
                return Effect.fail(DeviceActionNotFound(`Action with id ${actionId} does not exist on device "${this.name}"`))
            }
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
export function DeviceProperty<T>(id: DevicePropertyId, name: string, value: T, setterOrTypeConstraints: DeviceAction<T> | TypeConstraints<T>): DeviceProperty<T> {
    // used to discriminate setterOrTypeConstraints
    function isDeviceAction<T>(obj: DeviceAction<T> | TypeConstraints<T>): obj is DeviceAction<T> {
        return "id" in obj
    }
    if (isDeviceAction(setterOrTypeConstraints)) {
        return { id: id, name: name, value: value, setter: setterOrTypeConstraints, typeConstraints: setterOrTypeConstraints.inputTypeConstraints }
    } else {
        return { id: id, name: name, value: value, setter: undefined, typeConstraints: setterOrTypeConstraints }
    }
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
