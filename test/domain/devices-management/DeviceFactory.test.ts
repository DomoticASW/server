import { Effect } from "effect";
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js";
import { DeviceFactoryImpl } from "../../../src/domain/devices-management/DeviceFactoryImpl.js";
import { DeviceStatus, Device, DeviceId } from "../../../src/domain/devices-management/Device.js";
import { CommunicationError, DeviceActionError, DeviceUnreachableError } from "../../../src/ports/devices-management/Errors.js";

class DeviceCommunicationProtocolSpy implements DeviceCommunicationProtocol {
    callsToRegister: number = 0
    constructor(private deviceToCreate: Device, public deviceAddress?: URL) { }
    register(deviceAddress: URL): Effect.Effect<Device, DeviceUnreachableError> {
        this.callsToRegister += 1
        this.deviceAddress = deviceAddress
        return Effect.succeed(this.deviceToCreate)
    }
    checkDeviceStatus(): Effect.Effect<DeviceStatus, CommunicationError> {
        throw new Error("Method not implemented.");
    }
    executeDeviceAction(): Effect.Effect<void, CommunicationError | DeviceActionError> {
        throw new Error("Method not implemented.");
    }
}

test("DeviceFactory creates a device by reaching the given address through the communication protocol", () => {
    const address = new URL("deviceurl:8080")
    const expectedDevice = Device(DeviceId("1"), "device", address, DeviceStatus.Online, [], [], [])
    const commProtocol = new DeviceCommunicationProtocolSpy(expectedDevice)
    const factory = new DeviceFactoryImpl(commProtocol)
    const device = factory.create(address).pipe(Effect.runSync)
    expect(device.address).toEqual(address)
    expect(device).toEqual(expectedDevice)
    expect(commProtocol.callsToRegister).toBe(1)
    expect(commProtocol.deviceAddress).toEqual(address)
})
