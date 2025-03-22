import { Device, DeviceActionId, DeviceId, DevicePropertyId } from "../../domain/devices-management/Device.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DeviceNotFound, DevicePropertyNotFound } from "./Errors.js";
import { PermissionError } from "../permissions/Errors.js";
import { Token } from "../users-management/Token.js";
import { Result } from "option-t/plain_result";
import { InvalidTokenError, TokenError } from "../users-management/Errors.js";

export interface DevicesService {
    add(token: Token, deviceUrl: URL): Result<DeviceId, DeviceUnreachableError | TokenError>;
    remove(token: Token, deviceId: DeviceId): Result<undefined, DeviceNotFoundError | TokenError>;
    rename(token: Token, deviceId: DeviceId, name: string): Result<undefined, DeviceNotFoundError | TokenError>;
    find(token: Token, deviceId: DeviceId): Result<Device, DeviceNotFoundError | InvalidTokenError>;
    getAllDevices(token: Token): Result<Iterable<Device>, InvalidTokenError>;
    executeAction(token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Result<undefined, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFound | InvalidTokenError | PermissionError>;
    executeAutomationAction(deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Result<undefined, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFound>;
    updateDeviceProperty(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Result<undefined, InvalidInputError | DeviceNotFound | DevicePropertyNotFound>;
    subscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
    unsubscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
}
export interface DevicePropertyUpdatesSubscriber {
    devicePropertyChanged(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): void;
}