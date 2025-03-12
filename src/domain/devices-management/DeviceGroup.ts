import { DeviceGroupId, DeviceId } from "./Device.js";

export interface DeviceGroup {
    readonly id: DeviceGroupId;
    name: string;

    addDeviceToGroup(deviceId: DeviceId): void;
    removeDeviceFromGroup(deviceId: DeviceId): void;
}
