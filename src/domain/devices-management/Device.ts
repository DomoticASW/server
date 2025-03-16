import { InvalidInputError, DeviceActionError, DeviceActionNotFound } from "../../ports/devices-management/Errors.js";
import { TypeConstraints } from "../../ports/devices-management/Types.js";
import { Brand } from "../../utils/Brand.js";

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
