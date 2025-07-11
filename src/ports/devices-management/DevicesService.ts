import { Device, DeviceAddress, DeviceId, DevicePropertyId, DeviceStatus } from "../../domain/devices-management/Device.js";
import { DeviceUnreachableError, DeviceNotFoundError, DevicePropertyNotFound, DeviceAlreadyRegisteredError } from "./Errors.js";
import { Token } from "../../domain/users-management/Token.js";
import { Effect } from "effect/Effect";
import { InvalidTokenError, TokenError } from "../users-management/Errors.js";
import { DiscoveredDevice } from "../../domain/devices-management/DiscoveredDevice.js";

export interface DevicesService {
    add(token: Token, deviceAddress: DeviceAddress): Effect<DeviceId, DeviceAlreadyRegisteredError | DeviceUnreachableError | TokenError>;
    remove(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | TokenError>;
    rename(token: Token, deviceId: DeviceId, name: string): Effect<void, DeviceNotFoundError | TokenError>;
    find(token: Token, deviceId: DeviceId): Effect<Device, DeviceNotFoundError | InvalidTokenError>;
    findUnsafe(deviceId: DeviceId): Effect<Device, DeviceNotFoundError>;
    getAllDevices(token: Token): Effect<Iterable<Device>, InvalidTokenError>;
    getAllDevicesUnsafe(): Effect<Iterable<Device>, never>;
    updateDeviceProperty(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Effect<void, DeviceNotFoundError | DevicePropertyNotFound>;
    updateDeviceProperties(deviceId: DeviceId, properties: Map<DevicePropertyId, unknown>): Effect<void, DeviceNotFoundError | DevicePropertyNotFound>;
    setDeviceStatusUnsafe(deviceId: DeviceId, status: DeviceStatus): Effect<void, DeviceNotFoundError>
    subscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
    unsubscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void;
    discoveredDevices(token: Token): Effect<Iterable<DiscoveredDevice>, InvalidTokenError>
}

export interface DevicePropertyUpdatesSubscriber {
    devicePropertyChanged(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): void;
}
