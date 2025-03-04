import { DeviceGroupId, DeviceId } from "./Device.js";

export interface DeviceGroup {
    id: DeviceGroupId;
    name: string;
    // TODO: package private ???
    addDeviceToGroup(deviceId: DeviceId): void;
    // TODO: package private ???
    removeDeviceFromGroup(deviceId: DeviceId): void;
}
