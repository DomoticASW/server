import { Device, DeviceActionId, DeviceId, DevicePropertyId } from "../../domain/devices-management/Device.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DeviceNotFound, DevicePropertyNotFound } from "./Errors.js";
import { PermissionError } from "../permissions-management/Errors.js";
import { Token } from "../../domain/users-management/Token.js";
import { Effect } from "effect/Effect";
import { InvalidTokenError, TokenError } from "../users-management/Errors.js";

export interface DevicesService {
    add(token: Token, deviceUrl: URL): Effect<DeviceId, DeviceUnreachableError | TokenError>;
    remove(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | TokenError>;
    rename(token: Token, deviceId: DeviceId, name: string): Effect<void, DeviceNotFoundError | TokenError>;
    find(token: Token, deviceId: DeviceId): Effect<Device, DeviceNotFoundError | InvalidTokenError>;
    getAllDevices(token: Token): Effect<Iterable<Device>, InvalidTokenError>;
    executeAction(token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError | InvalidTokenError | PermissionError>;
    executeAutomationAction(deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError>;
    updateDeviceProperty(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Effect<void, InvalidInputError | DeviceNotFoundError | DevicePropertyNotFound>;
    subscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
    unsubscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
}
export interface DevicePropertyUpdatesSubscriber {
    devicePropertyChanged(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): void;
}