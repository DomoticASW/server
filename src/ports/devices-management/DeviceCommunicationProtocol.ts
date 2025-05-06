import { Effect } from "effect/Effect";
import { DeviceStatus } from "../../domain/devices-management/Device.js";
import { Brand } from "../../utils/Brand.js";
import { Error } from "../Error.js"

export interface DeviceCommunicationProtocol {
    checkDeviceStatus(deviceAddress: URL): Effect<DeviceStatus, CommunicationError>
}

export type CommunicationError = Brand<Error, "CommunicationError">
