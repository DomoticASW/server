import { Effect } from "effect";
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js";
import { DeviceFactoryImpl } from "../../../src/domain/devices-management/DeviceFactoryImpl.js";
import { DeviceStatus, Device, DeviceId } from "../../../src/domain/devices-management/Device.js";
import { CommunicationError, DeviceActionError, DeviceUnreachableError } from "../../../src/ports/devices-management/Errors.js";
import { DeviceFactory } from "../../../src/ports/devices-management/DeviceFactory.js";

let address: URL
let commProtocol: DeviceCommunicationProtocolSpy
let exampleDevice: Device
let factory: DeviceFactory

beforeEach(() => {
    address = new URL("deviceurl:8080")
    exampleDevice = Device(DeviceId("1"), "device", address, DeviceStatus.Online, [], [], [])
    commProtocol = new DeviceCommunicationProtocolSpy(exampleDevice)
    factory = new DeviceFactoryImpl(commProtocol)
})

test("DeviceFactory creates a device by reaching the given address through the communication protocol", () => {
    const device = factory.create(address).pipe(Effect.runSync)
    expect(device.address).toEqual(address)
    expect(device).toEqual(exampleDevice)
    expect(commProtocol.callsToRegister).toBe(1)
    expect(commProtocol.deviceAddress).toEqual(address)
})

test("DeviceFactory maps DeviceUnreachableErrors from CommunicationProtocol into DeviceUnreachableErrors", () => {
    const failingProtocol = {
        register: () => Effect.fail(CommunicationError())
    } as unknown as DeviceCommunicationProtocol
    factory = new DeviceFactoryImpl(failingProtocol)
    expect(() => factory.create(address).pipe(Effect.runSync)).toThrow("DeviceUnreachableError")
})

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
