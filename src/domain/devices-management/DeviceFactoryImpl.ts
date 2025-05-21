import { DeviceFactory } from "../../ports/devices-management/DeviceFactory.js";
import { DeviceUnreachableError } from "../../ports/devices-management/Errors.js";
import { Device } from "./Device.js";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";
import { Effect, pipe } from "effect";

export class DeviceFactoryImpl implements DeviceFactory {

    constructor(private deviceCommunicationProtocol: DeviceCommunicationProtocol) { }

    create(deviceUrl: URL): Effect.Effect<Device, DeviceUnreachableError> {
        return pipe(
            this.deviceCommunicationProtocol.register(deviceUrl),
            Effect.mapError(err =>
                err.__brand == "CommunicationError" ? DeviceUnreachableError(`${err.message}\n${err.cause}`) : err
            )
        )
    }
}
