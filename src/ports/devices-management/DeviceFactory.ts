import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device } from "../../domain/devices-management/Device.js";

export interface DeviceFactory {
    create(deviceUrl: URL): Device | DeviceUnreachableError;
}
