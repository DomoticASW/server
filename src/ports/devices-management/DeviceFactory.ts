import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device } from "../../domain/devices-management/Device.js";
import { Effect } from "effect/Effect";

export interface DeviceFactory {
    create(deviceUrl: URL): Effect<Device, DeviceUnreachableError>;
}
