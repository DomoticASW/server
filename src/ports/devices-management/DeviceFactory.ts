import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device } from "./Device.js";

// TODO: package private ???
export interface DeviceFactory {
    create(deviceUrl: URL): Device | DeviceUnreachableError;
}
