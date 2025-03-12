import { InvalidInputError, DeviceActionError, DeviceActionNotFound } from "../../ports/devices-management/Errors.js";
import { TypeConstraints } from "../../ports/devices-management/Types.js";

export type DeviceId = string;
export type DeviceGroupId = string;
export type DeviceActionId = string;
export type DevicePropertyId = string;

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

    executeAction(actionId: DeviceActionId, input: unknown): InvalidInputError | DeviceActionError | DeviceActionNotFound | undefined;
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

    execute(input: T): InvalidInputError | DeviceActionError | undefined;
}

export interface DeviceEvent {
    readonly name: string;
}
