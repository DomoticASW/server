import { Effect, pipe } from "effect"
import { DeviceEventsServiceImpl } from "../../../src/domain/devices-management/DeviceEventsServiceImpl.js"
import { DeviceEventsService, DeviceEventsSubscriber } from "../../../src/ports/devices-management/DeviceEventsService.js"
import { DeviceId, DeviceEvent, Device, DeviceStatus, DeviceAddress } from "../../../src/domain/devices-management/Device.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"

let service: DeviceEventsService
const device = Device(DeviceId("1"), "Lamp", DeviceAddress("localhost", 8080), DeviceStatus.Online, [], [], [DeviceEvent("turned-on"), DeviceEvent("turned-off")])
let devicesService: DevicesService

beforeEach(() => {
    devicesService = {
        findUnsafe(deviceId: DeviceId) {
            if (deviceId === device.id) return Effect.succeed(device)
            else return Effect.fail(DeviceNotFoundError())
        }
    } as unknown as DevicesService
    service = new DeviceEventsServiceImpl(devicesService)
})

test("publishEvent throws if the device is not found", () => {
    expect(() => pipe(
        service.publishEvent(DeviceId("hello"), "event"),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("publishEvent throws if the given event name is not part of device events", () => {
    expect(() => pipe(
        service.publishEvent(device.id, "badName"),
        Effect.runSync
    )).toThrow("NotDeviceEventError")
})

test("subscribeForDeviceEvents lets subscriber receive events", () => {
    let eventDeviceId: DeviceId
    let eventEvent: DeviceEvent
    const subscriber: DeviceEventsSubscriber = {
        deviceEventPublished: function (deviceId: DeviceId, event: DeviceEvent): void {
            eventDeviceId = deviceId
            eventEvent = event
        }
    }
    pipe(
        Effect.gen(function* () {
            service.subscribeForDeviceEvents(subscriber)
            const eventToFire = device.events[0]
            yield* service.publishEvent(device.id, eventToFire.name)
            expect(eventDeviceId).toEqual(device.id)
            expect(eventEvent).toEqual(eventToFire)
        }),
        Effect.runSync
    )
})

test("subscribeForDeviceEvents registers multiple subscribers", () => {
    let calls = 0
    const subscriber1: DeviceEventsSubscriber = {
        deviceEventPublished: function (): void {
            calls += 1
        }
    }
    const subscriber2: DeviceEventsSubscriber = {
        deviceEventPublished: function (): void {
            calls += 1
        }
    }
    pipe(
        Effect.gen(function* () {
            service.subscribeForDeviceEvents(subscriber1)
            service.subscribeForDeviceEvents(subscriber2)
            yield* service.publishEvent(device.id, device.events[0].name)
            expect(calls).toEqual(2)
        }),
        Effect.runSync
    )
})

test("unsubscribeForDeviceEvents unregisters subscribers", () => {
    let calls = 0
    const subscriber: DeviceEventsSubscriber = {
        deviceEventPublished: function (): void {
            calls += 1
        }
    }
    pipe(
        Effect.gen(function* () {
            service.subscribeForDeviceEvents(subscriber)
            yield* service.publishEvent(device.id, device.events[0].name)
            service.unsubscribeForDeviceEvents(subscriber)
            yield* service.publishEvent(device.id, device.events[0].name)
            expect(calls).toEqual(1)
        }),
        Effect.runSync
    )
})