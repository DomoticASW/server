import { Effect, pipe } from "effect"
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js"
import { DeviceStatusChangesSubscriber } from "../../../src/ports/devices-management/DeviceStatusesService.js"
import { Device, DeviceAddress, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceStatusesServiceImpl } from "../../../src/domain/devices-management/DeviceStatusesServiceImpl.js"
import { DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"

const pollingRateMillis: number = 10
let devicesService: DevicesService

function delay(ms: number) { return new Promise(res => setTimeout(res, ms)) }

beforeEach(() => {
    const serv = {
        devices: [
            Device(DeviceId("1"), "Lamp", DeviceAddress("192.168.0.1", 8080), DeviceStatus.Online, [], [], []),
            Device(DeviceId("2"), "Oven", DeviceAddress("192.168.0.2", 8080), DeviceStatus.Online, [], [], []),
            Device(DeviceId("3"), "Dishwasher", DeviceAddress("192.168.0.3", 8080), DeviceStatus.Online, [], [], [])
        ],
        getAllDevicesUnsafe() {
            return Effect.succeed(this.devices)
        },
        findUnsafe(deviceId: DeviceId) {
            return pipe(
                Effect.fromNullable(this.devices.find(d => d.id === deviceId)),
                Effect.mapError(() => DeviceNotFoundError())
            )
        },
        setDeviceStatusUnsafe(deviceId: DeviceId, status: DeviceStatus) {
            return pipe(
                Effect.fromNullable(this.devices.find(d => d.id === deviceId)),
                Effect.map((d) => d.status = status)
            )
        }
    }
    devicesService = serv as unknown as DevicesService
})

// DeviceCommunicationProtocol that inverts the status of a device every time checkDeviceStatus is called
function protocolInvertingStatus(): DeviceCommunicationProtocol {
    let turn = true
    return {
        checkDeviceStatus(address: DeviceAddress) {
            if (address.host === "192.168.0.1" && address.port === 8080) {
                const status = turn ? DeviceStatus.Online : DeviceStatus.Offline
                turn = !turn
                return Effect.succeed(status)
            }
            return Effect.succeed(DeviceStatus.Online)
        },
    } as unknown as DeviceCommunicationProtocol
}

test("subscribeForDeviceStatusChanges lets subscriber receive updates approximately every X milliseconds", async () => {
    const service = new DeviceStatusesServiceImpl(pollingRateMillis, devicesService, protocolInvertingStatus())

    let updatedDeviceId: DeviceId = DeviceId("-1")
    let updatedStatus: DeviceStatus = DeviceStatus.Online
    let calls = 0
    const subscriber: DeviceStatusChangesSubscriber = {
        deviceStatusChanged: function (deviceId: DeviceId, status: DeviceStatus): Effect.Effect<void> {
            calls += 1
            updatedDeviceId = deviceId
            updatedStatus = status
            return Effect.succeed(undefined)
        }
    }

    await delay(20) // simulate the service being active for some time

    expect(calls).toEqual(0)
    service.subscribeForDeviceStatusChanges(subscriber)
    expect(calls).toEqual(0)
    await delay(10)
    expect(calls).toEqual(1)
    expect(updatedDeviceId).toEqual(DeviceId("1"))
    const lastUpdatedStatus = updatedStatus
    await delay(10)
    expect(calls).toEqual(2)
    expect(updatedDeviceId).toEqual(DeviceId("1"))
    expect(updatedStatus).not.toEqual(lastUpdatedStatus)

    // checking that unsubscribing results in no more events being published
    service.unsubscribeForDeviceStatusChanges(subscriber)
    await delay(30)
    expect(calls).toEqual(2)

    service.stop()
})

test("updates persisted device status through DevicesService", async () => {
    const deviceId = DeviceId("1")
    const device = await Effect.runPromise(devicesService.findUnsafe(deviceId))
    expect(device.status).toEqual(DeviceStatus.Online)
    const service = new DeviceStatusesServiceImpl(pollingRateMillis, devicesService, protocolInvertingStatus())
    // first poll starts immediately and causes mock device to go offline
    // second poll happens at 10 ms and will read the device offline
    // next poll will be at 20 ms so the best time to read is between this and the previous poll
    await delay(15)
    const updatedDevice = await Effect.runPromise(devicesService.findUnsafe(deviceId))
    expect(updatedDevice.status).toEqual(DeviceStatus.Offline)
    service.stop()
})