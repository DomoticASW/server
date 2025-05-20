import { Effect } from "effect/Effect";
import { DeviceActionId, DeviceStatus } from "../../domain/devices-management/Device.js";
import { CommunicationError, DeviceActionError } from "./Errors.js";

export interface DeviceCommunicationProtocol {
    checkDeviceStatus(deviceAddress: URL): Effect<DeviceStatus, CommunicationError>
    executeDeviceAction(deviceAddress: URL, deviceActionId: DeviceActionId, input: unknown): Effect<void, CommunicationError | DeviceActionError>
}
