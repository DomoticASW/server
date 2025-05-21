import { Effect } from "effect/Effect";
import { DeviceFactory } from "../../ports/devices-management/DeviceFactory.js";
import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device } from "./Device.js";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";

export class DeviceFactoryImpl implements DeviceFactory {

    constructor(private deviceCommunicationProtocol: DeviceCommunicationProtocol) { }

    create(deviceUrl: URL): Effect<Device, DeviceUnreachableError> {
        return this.deviceCommunicationProtocol.register(deviceUrl)
    }
}
