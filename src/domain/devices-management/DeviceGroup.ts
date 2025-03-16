import { Brand } from "../../utils/Brand.js";
import { DeviceId } from "./Device.js";

export type DeviceGroupId = Brand<string, "DeviceGroupId">
export function DeviceGroupId(id: string): DeviceGroupId { return id as DeviceGroupId }

export interface DeviceGroup {
    readonly id: DeviceGroupId;
    name: string;

    addDeviceToGroup(deviceId: DeviceId): void;
    removeDeviceFromGroup(deviceId: DeviceId): void;
}
