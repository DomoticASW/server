import { Effect } from "effect/Effect";
import { Device, DeviceActionId, DeviceStatus } from "../../domain/devices-management/Device.js";
import { CommunicationError, DeviceActionError, DeviceUnreachableError } from "./Errors.js";

export interface DeviceCommunicationProtocol {
    checkDeviceStatus(deviceAddress: URL): Effect<DeviceStatus, CommunicationError>
    executeDeviceAction(deviceAddress: URL, deviceActionId: DeviceActionId, input: unknown): Effect<void, CommunicationError | DeviceActionError>
    register(deviceAddress: URL): Effect<Device, DeviceUnreachableError>
}
