import { DeviceActionError, DeviceActionNotFound, InvalidInputError } from "./Errors.js";
import { TypeConstraints } from "./Types.js";

export type DeviceId = string;
export type DeviceGroupId = string;
export type DeviceActionId = string;
export type DevicePropertyId = string;

export enum DeviceStatus {
    Online = "Online",
    Offline = "Offline"
}

export interface Device {
    id: DeviceId;
    name: string;
    address: URL;

    status: DeviceStatus;
    properties: Map<DevicePropertyId, DeviceProperty<unknown>>;
    actions: Map<DeviceActionId, DeviceAction<unknown>>;
    events: Map<string, DeviceEvent>;

    // TODO: package private ???
    executeAction(actionId: DeviceActionId, input: unknown): InvalidInputError | DeviceActionError | DeviceActionNotFound | undefined;
}

export interface DeviceProperty<T> {
    id: DevicePropertyId;
    name: string;
    value: T;

    setter?: DeviceAction<T>;
    typeConstraints: TypeConstraints<T>;
}

export interface DeviceAction<T> {
    id: DeviceActionId;
    name: string;
    description?: string;

    inputTypeConstraints: TypeConstraints<T>;

    // TODO: package private ???
    execute(input: T): InvalidInputError | DeviceActionError | undefined;
}

export interface DeviceEvent {
    name: string;
}
