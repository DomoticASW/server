import { Effect } from "effect"
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js"
import { DeviceStatusChangesSubscriber } from "../../../src/ports/devices-management/DeviceStatusesService.js"
import { Device, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceStatusesServiceImpl } from "../../../src/domain/devices-management/DeviceStatusesServiceImpl.js"

let service: DeviceStatusesServiceImpl
let protocol: DeviceCommunicationProtocol
let devicesService: DevicesService
let pollingRateMillis: number

function delay(ms: number) { return new Promise(res => setTimeout(res, ms)) }

beforeEach(() => {
    devicesService = {
        getAllDevicesUnsafe() {
            return Effect.succeed([
                Device(DeviceId("1"), "Lamp", new URL("http://192.168.0.1"), DeviceStatus.Online, [], [], []),
                Device(DeviceId("2"), "Oven", new URL("http://192.168.0.2"), DeviceStatus.Online, [], [], []),
                Device(DeviceId("3"), "Dishwasher", new URL("http://192.168.0.3"), DeviceStatus.Online, [], [], []),
            ])
        }
    } as unknown as DevicesService
    protocol = {
        checkDeviceStatus() {
            return Effect.succeed(DeviceStatus.Online)
        },
    }
    pollingRateMillis = 10
    service = new DeviceStatusesServiceImpl(pollingRateMillis, devicesService, protocol)
})

afterEach(() => {
    service.stop()
})

test("subscribeForDeviceStatusChanges lets subscriber receive updates approximately every X milliseconds", async () => {
    // DeviceCommunicationProtocol that inverts the status of a device every time checkDeviceStatus is called
    let turn = true
    protocol = {
        checkDeviceStatus(url: URL) {
            if (url.toString() === new URL("http://192.168.0.1").toString()) {
                const status = turn ? DeviceStatus.Online : DeviceStatus.Offline
                turn = !turn
                return Effect.succeed(status)
            }
            return Effect.succeed(DeviceStatus.Online)
        },
    }
    service.stop() // stops old service since it is going to be overwritten
    service = new DeviceStatusesServiceImpl(pollingRateMillis, devicesService, protocol)

    let updatedDeviceId: DeviceId = DeviceId("0")
    let updatedStatus: DeviceStatus = DeviceStatus.Online
    let calls = 0
    const subscriber: DeviceStatusChangesSubscriber = {
        deviceStatusChanged: function (deviceId: DeviceId, status: DeviceStatus): void {
            calls += 1
            updatedDeviceId = deviceId
            updatedStatus = status
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
})
