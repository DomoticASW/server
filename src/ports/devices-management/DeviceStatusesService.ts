import { DeviceId, DeviceStatus } from "./Device.js";

export interface DeviceStatusesService {
    subscribeForDeviceStatusChanges(subscriber: DeviceStatusChangesSubscriber): void;
    unsubscribeForDeviceStatusChanges(subscriber: DeviceStatusChangesSubscriber): void;
}
export interface DeviceStatusChangesSubscriber {
    deviceStatusChanged(deviceId: DeviceId, status: DeviceStatus): void;
}
