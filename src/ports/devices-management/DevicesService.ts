import { Device, DeviceActionId, DeviceId, DevicePropertyId } from "../../domain/devices-management/Device.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DeviceNotFound, DevicePropertyNotFound } from "./Errors.js";
import { TokenError, PermissionError, InvalidTokenError } from "../permissions/Errors.js";
import { Token } from "../permissions/Token.js";

export interface DevicesService {
    add(token: Token, deviceUrl: URL): DeviceId | DeviceUnreachableError | TokenError;
    remove(token: Token, deviceId: DeviceId): DeviceNotFoundError | TokenError | undefined;
    rename(token: Token, deviceId: DeviceId, name: string): DeviceNotFoundError | TokenError | undefined;
    find(token: Token, deviceId: DeviceId): Device | DeviceNotFoundError | InvalidTokenError;
    getAllDevices(token: Token): Iterable<Device> | InvalidTokenError;
    executeAction(token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFound | InvalidTokenError | PermissionError | undefined;
    executeAutomationAction(deviceId: DeviceId, actionId: DeviceActionId, input: unknown): InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFound | undefined;
    updateDeviceProperty(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): InvalidInputError | DeviceNotFound | DevicePropertyNotFound | undefined;
    subscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
    unsubscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
}
export interface DevicePropertyUpdatesSubscriber {
    devicePropertyChanged(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): void;
}