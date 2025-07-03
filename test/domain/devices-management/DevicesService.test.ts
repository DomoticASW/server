import { Effect, pipe } from "effect"
import { DeviceId, Device, DeviceStatus, DevicePropertyId, DeviceProperty, DeviceAction, DeviceEvent, DeviceAddress } from "../../../src/domain/devices-management/Device.js"
import { Token } from "../../../src/domain/users-management/Token.js"
import { Email, Role } from "../../../src/domain/users-management/User.js"
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { DevicesServiceImpl } from "../../../src/domain/devices-management/DevicesServiceImpl.js"
import { DeviceFactory } from "../../../src/ports/devices-management/DeviceFactory.js"
import { DeviceUnreachableError } from "../../../src/ports/devices-management/Errors.js"
import { DeviceRepository } from "../../../src/ports/devices-management/DeviceRepository.js"
import { NoneInt } from "../../../src/domain/devices-management/Types.js"
import { InvalidTokenError } from "../../../src/ports/users-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UsersService.js"
import { DeviceDiscoverer } from "../../../src/ports/devices-management/DeviceDiscoverer.js"

let service: DevicesService
let deviceFactory: DeviceFactory
let deviceDiscoverer: DeviceDiscoverer & { callsToDiscoveredDevices: number }
let repo: DeviceRepository
const alwaysValidTokenUsersService = {
    verifyToken() {
        return Effect.succeed(null)
    }
} as unknown as UsersService

function makeToken(role: Role = Role.Admin): Token {
    return {
        userEmail: Email("ciccio.pasticcio@email.com"),
        role: role,
        source: "test",
    }
}

beforeEach(() => {
    repo = new InMemoryRepositoryMock((d) => d.id, (id) => id)
    deviceFactory = {
        create(deviceAddress: DeviceAddress): Effect.Effect<Device, DeviceUnreachableError> {
            const properties = [DeviceProperty(DevicePropertyId("prop"), "prop", 0, NoneInt()), DeviceProperty(DevicePropertyId("prop2"), "prop2", 10, NoneInt())]
            const actions: DeviceAction<unknown>[] = []
            const events: DeviceEvent[] = []
            return Effect.succeed(Device(DeviceId(deviceAddress.toString()), "device", deviceAddress, DeviceStatus.Online, properties, actions, events))
        }
    }
    deviceDiscoverer = {
        discoveredDevices() {
            this.callsToDiscoveredDevices += 1
            return []
        },
        callsToDiscoveredDevices: 0
    }
    service = new DevicesServiceImpl(repo, deviceFactory, alwaysValidTokenUsersService, deviceDiscoverer)
})

test("has 0 devices initially", () => {
    const devices = Effect.runSync(service.getAllDevices(makeToken()))
    expect(devices).toHaveLength(0)
})

test("adding a device adds it to all devices", () => {
    const devices = pipe(
        Effect.gen(function* () {
            yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            return yield* service.getAllDevices(makeToken())
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(1)
})

test("adding a device persists it to the repository", () => {
    const devices = pipe(
        Effect.gen(function* () {
            yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            return yield* repo.getAll()
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(1)
})

test("uses DeviceFactory to construct devices", () => {
    const deviceUrl = DeviceAddress("localhost", 8080)
    const device = pipe(
        Effect.gen(function* () {
            yield* service.add(makeToken(), deviceUrl)
            return Array.from(yield* repo.getAll())[0]
        }),
        Effect.runSync
    )
    const expected = Effect.runSync(deviceFactory.create(deviceUrl))
    expect(device).toEqual(expected)
})

test("getAllDevicesUnsafe retrieves all devices", () => {
    const devices = pipe(
        Effect.gen(function* () {
            yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            return yield* service.getAllDevicesUnsafe()
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(1)
})

test("find retrieves devices by id", () => {
    const [id, device] = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            return [id, device] as [DeviceId, Device]
        }),
        Effect.runSync
    )
    expect(device.id).toEqual(id)
})

test("find returns an error in case device is not found", () => {
    expect(() => pipe(
        service.find(makeToken(), DeviceId(DeviceAddress("localhost", 8080).toString())),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("findUnsafe retrieves devices by id", () => {
    const [id, device] = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.findUnsafe(id)
            return [id, device] as [DeviceId, Device]
        }),
        Effect.runSync
    )
    expect(device.id).toEqual(id)
})

test("remove removes devices by id", () => {
    const devices = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            yield* service.remove(makeToken(), id)
            return yield* service.getAllDevices(makeToken())
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(0)
})

test("remove returns an error in case device is not found", () => {
    expect(() => pipe(
        service.remove(makeToken(), DeviceId(DeviceAddress("localhost", 8080).toString())),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("rename renames device with given id", () => {
    const newName = "newName"
    const device = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            yield* service.rename(makeToken(), id, newName)
            return yield* service.find(makeToken(), id)
        }),
        Effect.runSync
    )
    expect(device.name).toEqual(newName)
})

test("rename returns an error in case device is not found", () => {
    expect(() => pipe(
        service.rename(makeToken(), DeviceId(DeviceAddress("localhost", 8080).toString()), "newName"),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("updateDeviceProperty updates the value of a device property", () => {
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const property = device.properties[0]
            const oldValue = property.value
            const newValue = 12098
            expect(oldValue).not.toEqual(newValue)
            yield* service.updateDeviceProperty(id, property.id, newValue)
            const newDevice = yield* service.find(makeToken(), id)
            const newProperty = newDevice.properties[0]
            expect(newProperty.value).toEqual(newValue)
        }),
        Effect.runSync
    )
})

test("updateDeviceProperty returns an error in case device is not found", () => {
    const deviceId = DeviceId(DeviceAddress("localhost", 8080).toString())
    const propertyId = DevicePropertyId("property")
    expect(() => pipe(
        service.updateDeviceProperty(deviceId, propertyId, 3),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("updateDeviceProperty returns an error in case device property is not found", () => {
    expect(() => pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            yield* service.updateDeviceProperty(id, DevicePropertyId("property"), 3)
        }),
        Effect.runSync
    )).toThrow("DevicePropertyNotFound")
})

test("updateDeviceProperties updates the value of multiple device properties", () => {
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const property0 = device.properties[0]
            const property1 = device.properties[1]
            const oldValue0 = property0.value
            const oldValue1 = property1.value
            const newValue0 = 12098
            const newValue1 = 47382
            expect(oldValue0).not.toEqual(newValue0)
            expect(oldValue1).not.toEqual(newValue1)
            const changes = new Map<DevicePropertyId, unknown>([
                [property0.id, newValue0],
                [property1.id, newValue1]
            ])
            yield* service.updateDeviceProperties(id, changes)
            const newDevice = yield* service.find(makeToken(), id)
            const newProperty0 = newDevice.properties[0]
            const newProperty1 = newDevice.properties[1]
            expect(newProperty0.value).toEqual(newValue0)
            expect(newProperty1.value).toEqual(newValue1)
        }),
        Effect.runSync
    )
})

test("updateDeviceProperties returns an error in case device is not found", () => {
    const deviceId = DeviceId(DeviceAddress("localhost", 8080).toString())
    expect(() => pipe(
        service.updateDeviceProperties(deviceId, new Map()),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("updateDeviceProperties returns an error in case any device property is not found, without updating any", () => {
    const deviceId = service.add(makeToken(), DeviceAddress("localhost", 8080)).pipe(Effect.runSync)
    let oldValue: unknown
    const newValue = 238219
    expect(() => pipe(
        Effect.gen(function* () {
            const device = yield* service.find(makeToken(), deviceId)
            const property = device.properties[0]
            oldValue = property.value
            expect(oldValue).not.toEqual(newValue)
            const changes = new Map<DevicePropertyId, unknown>([
                [property.id, newValue],
                [DevicePropertyId("not exists"), 1000]
            ])
            yield* service.updateDeviceProperties(deviceId, changes)
        }),
        Effect.runSync
    )).toThrow("DevicePropertyNotFound")
    pipe(
        service.find(makeToken(), deviceId),
        Effect.map((device) => expect(device.properties[0].value).toEqual(oldValue)),
        Effect.runSync
    )
})

test("setDeviceStatusUnsafe sets a device status", () => {
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const newStatus = DeviceStatus.Offline
            expect(device.status).not.toEqual(newStatus)
            yield* service.setDeviceStatusUnsafe(id, DeviceStatus.Offline)
            const newDevice = yield* service.find(makeToken(), id)
            expect(newDevice.status).toEqual(newStatus)
        }),
        Effect.runSync
    )
})

test("setDeviceStatusUnsafe to fail if device not found", () => {
    expect(() =>
        Effect.runSync(service.setDeviceStatusUnsafe(DeviceId("non-existing"), DeviceStatus.Offline))
    ).toThrow("DeviceNotFoundError")
})

test("subscribeForDevicePropertyUpdates lets subscriber receive updates when a property is updated", () => {
    let updatedDeviceId: DeviceId
    let updatedDevicePropertyId: DevicePropertyId
    let updatedPropertyValue: unknown
    const subscriber: DevicePropertyUpdatesSubscriber = {
        devicePropertyChanged: function (deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): void {
            updatedDeviceId = deviceId
            updatedDevicePropertyId = propertyId
            updatedPropertyValue = value
        }
    }
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const property = device.properties[0]
            const newValue = 3
            service.subscribeForDevicePropertyUpdates(subscriber)
            yield* service.updateDeviceProperty(id, property.id, newValue)
            expect(updatedDeviceId).toEqual(id)
            expect(updatedDevicePropertyId).toEqual(property.id)
            expect(updatedPropertyValue).toEqual(newValue)
        }),
        Effect.runSync
    )
})

test("subscribeForDevicePropertyUpdates lets subscriber receive updates when multiple properties are updated", () => {
    let updatedDeviceId: DeviceId
    let updatedDevicePropertyId0: DevicePropertyId
    let updatedPropertyValue0: unknown
    let updatedPropertyValue1: unknown
    const subscriber: DevicePropertyUpdatesSubscriber = {
        devicePropertyChanged: function (deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): void {
            updatedDeviceId = deviceId
            if (propertyId == updatedDevicePropertyId0) {
                updatedPropertyValue0 = value
            } else {
                updatedPropertyValue1 = value
            }
        }
    }
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const property0 = device.properties[0]
            updatedDevicePropertyId0 = property0.id
            const property1 = device.properties[1]
            const newValue0 = 10
            const newValue1 = 20
            expect(property0.value).not.toBe(newValue0)
            expect(property1.value).not.toBe(newValue1)
            const changes = new Map<DevicePropertyId, unknown>([
                [property0.id, newValue0],
                [property1.id, newValue1]
            ])
            service.subscribeForDevicePropertyUpdates(subscriber)
            yield* service.updateDeviceProperties(id, changes)
            expect(updatedDeviceId).toEqual(id)
            expect(updatedPropertyValue0).toEqual(newValue0)
            expect(updatedPropertyValue1).toEqual(newValue1)
        }),
        Effect.runSync
    )
})

test("subscribeForDevicePropertyUpdates registers multiple subscribers", () => {
    let calls = 0
    const subscriber1: DevicePropertyUpdatesSubscriber = {
        devicePropertyChanged: function (): void {
            calls += 1
        }
    }
    const subscriber2: DevicePropertyUpdatesSubscriber = {
        devicePropertyChanged: function (): void {
            calls += 1
        }
    }
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const property = device.properties[0]
            const newValue = 3
            service.subscribeForDevicePropertyUpdates(subscriber1)
            service.subscribeForDevicePropertyUpdates(subscriber2)
            yield* service.updateDeviceProperty(id, property.id, newValue)
            expect(calls).toEqual(2)
        }),
        Effect.runSync
    )
})

test("unsubscribeForDevicePropertyUpdates unregisters subscribers", () => {
    let calls = 0
    const subscriber: DevicePropertyUpdatesSubscriber = {
        devicePropertyChanged: function (): void {
            calls += 1
        }
    }
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
            const device = yield* service.find(makeToken(), id)
            const property = device.properties[0]
            const newValue = 3
            service.subscribeForDevicePropertyUpdates(subscriber)
            yield* service.updateDeviceProperty(id, property.id, newValue)
            service.unsubscribeForDevicePropertyUpdates(subscriber)
            yield* service.updateDeviceProperty(id, property.id, newValue + 1)
            expect(calls).toEqual(1)
        }),
        Effect.runSync
    )
})

test("discoveredDevices delegates to the given DeviceDiscoverer", () => {
    expect(deviceDiscoverer.callsToDiscoveredDevices).toEqual(0)
    const result = pipe(
        service.discoveredDevices(makeToken()),
        Effect.runSync
    )
    expect(result).toEqual(deviceDiscoverer.discoveredDevices())
    expect(deviceDiscoverer.callsToDiscoveredDevices).toEqual(2)
})


describe("all methods requiring a token fail if the token is invalid", () => {
    const deviceId = DeviceId("1")
    const token = makeToken()
    const allMethods: Array<(s: DevicesService) => Effect.Effect<unknown, unknown>> = [
        (s) => s.add(token, DeviceAddress("localhost", 8080)),
        (s) => s.remove(token, deviceId),
        (s) => s.rename(token, deviceId, "Oven"),
        (s) => s.find(token, deviceId),
        (s) => s.getAllDevices(token),
        (s) => s.discoveredDevices(token)
    ]

    beforeEach(() => {
        const alwaysInvalidTokenUsersService = {
            verifyToken(): Effect.Effect<void, InvalidTokenError> {
                return Effect.fail({ __brand: "InvalidTokenError", message: "" })
            }
        } as unknown as UsersService
        service = new DevicesServiceImpl(repo, deviceFactory, alwaysInvalidTokenUsersService, deviceDiscoverer)
    })

    allMethods.forEach(m => {
        test(m.toString(), async () => {
            await expect(() => pipe(
                m(service),
                Effect.runPromise
            )).rejects.toThrow("InvalidTokenError")
        })
    })
})

describe("'privileged' methods fail if the user is not an admin (UnauthorizedError)", () => {
    const deviceId = DeviceId("1")
    const token = makeToken(Role.User)
    const allMethods: Array<(s: DevicesService) => Effect.Effect<unknown, unknown>> = [
        (s) => s.add(token, DeviceAddress("localhost", 8080)),
        (s) => s.remove(token, deviceId),
        (s) => s.rename(token, deviceId, "Oven"),
    ]

    allMethods.forEach(m => {
        test(m.toString(), async () => {
            await expect(() => pipe(
                m(service),
                Effect.runPromise
            )).rejects.toThrow("UnauthorizedError")
        })
    })
})
