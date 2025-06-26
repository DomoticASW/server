import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device, DeviceAddress } from "../../domain/devices-management/Device.js";
import { Effect } from "effect/Effect";

export interface DeviceFactory {
    create(deviceAddress: DeviceAddress): Effect<Device, DeviceUnreachableError>;
}
