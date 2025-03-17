import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device } from "../../domain/devices-management/Device.js";
import { Result } from "option-t/plain_result";

export interface DeviceFactory {
    create(deviceUrl: URL): Result<Device, DeviceUnreachableError>;
}
