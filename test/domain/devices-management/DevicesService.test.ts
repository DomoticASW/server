import { Effect, pipe } from "effect"
import { DeviceId, Device, DeviceStatus, DevicePropertyId, DeviceProperty, DeviceAction, DeviceEvent, DeviceActionId } from "../../../src/domain/devices-management/Device.js"
import { UserRole, Token } from "../../../src/domain/users-management/Token.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { DevicesServiceImpl } from "../../../src/domain/devices-management/DevicesServiceImpl.js"
import { DeviceFactory } from "../../../src/ports/devices-management/DeviceFactory.js"
import { DeviceUnreachableError } from "../../../src/ports/devices-management/Errors.js"
import { DeviceRepository } from "../../../src/ports/devices-management/DeviceRepository.js"
import { NoneInt } from "../../../src/domain/devices-management/Types.js"
import { InvalidTokenError } from "../../../src/ports/users-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UserService.js"

let service: DevicesService
let deviceFactory: DeviceFactory
let repo: DeviceRepository

function makeToken(role: UserRole = UserRole.Admin): Token {
    return {
        userEmail: Email("ciccio.pasticcio@email.com"),
        role: role
    }
}

beforeEach(() => {
    repo = new InMemoryRepositoryMock((d) => d.id)
    deviceFactory = {
        create(deviceUrl: URL): Effect.Effect<Device, DeviceUnreachableError> {
            const properties = [DeviceProperty(DevicePropertyId("prop"), "prop", 0, NoneInt())]
            const actions: DeviceAction<unknown>[] = []
            const events: DeviceEvent[] = []
            return Effect.succeed(Device(DeviceId(deviceUrl.toString()), "device", deviceUrl, DeviceStatus.Online, properties, actions, events))
        }
    }
    const alwaysValidTokenUsersService = {
        verifyToken() {
            return Effect.succeed(null)
        }
    } as unknown as UsersService
    service = new DevicesServiceImpl(repo, deviceFactory, alwaysValidTokenUsersService)
})

test("has 0 devices initially", () => {
    const devices = Effect.runSync(service.getAllDevices(makeToken()))
    expect(devices).toHaveLength(0)
})

test("adding a device adds it to all devices", () => {
    const devices = pipe(
        Effect.gen(function* () {
            yield* service.add(makeToken(), new URL("http://localhost"))
            return yield* service.getAllDevices(makeToken())
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(1)
})

test("adding a device persists it to the repository", () => {
    const devices = pipe(
        Effect.gen(function* () {
            yield* service.add(makeToken(), new URL("http://localhost"))
            return yield* repo.getAll()
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(1)
})

test("uses DeviceFactory to construct devices", () => {
    const deviceUrl = new URL("http://localhost")
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

test("find retrieves devices by id", () => {
    const [id, device] = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
            const device = yield* service.find(makeToken(), id)
            return [id, device] as [DeviceId, Device]
        }),
        Effect.runSync
    )
    expect(device.id).toEqual(id)
})

test("find returns an error in case device is not found", () => {
    expect(() => pipe(
        service.find(makeToken(), DeviceId(new URL("http://localhost").toString())),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("remove removes devices by id", () => {
    const devices = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
            yield* service.remove(makeToken(), id)
            return yield* service.getAllDevices(makeToken())
        }),
        Effect.runSync
    )
    expect(devices).toHaveLength(0)
})

test("remove returns an error in case device is not found", () => {
    expect(() => pipe(
        service.remove(makeToken(), DeviceId(new URL("http://localhost").toString())),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("rename renames device with given id", () => {
    const newName = "newName"
    const device = pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
            yield* service.rename(makeToken(), id, newName)
            return yield* service.find(makeToken(), id)
        }),
        Effect.runSync
    )
    expect(device.name).toEqual(newName)
})

test("rename returns an error in case device is not found", () => {
    expect(() => pipe(
        service.rename(makeToken(), DeviceId(new URL("http://localhost").toString()), "newName"),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("updateDeviceProperty updates the value of a device property", () => {
    pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
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
    const deviceId = DeviceId(new URL("http://localhost").toString())
    const propertyId = DevicePropertyId("property")
    expect(() => pipe(
        service.updateDeviceProperty(deviceId, propertyId, 3),
        Effect.runSync
    )).toThrow("DeviceNotFoundError")
})

test("updateDeviceProperty returns an error in case device property is not found", () => {
    expect(() => pipe(
        Effect.gen(function* () {
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
            yield* service.updateDeviceProperty(id, DevicePropertyId("property"), 3)
        }),
        Effect.runSync
    )).toThrow("DevicePropertyNotFound")
})

test("subscribeForDevicePropertyUpdates lets subscriber receive updates", () => {
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
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
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
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
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
            const id = yield* service.add(makeToken(), new URL("http://localhost"))
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

describe("all methods requiring a token fail if the token is invalid", () => {
    const deviceId = DeviceId("1")
    const token = makeToken()
    const allMethods: Array<(s: DevicesService) => Effect.Effect<unknown, unknown>> = [
        (s) => s.add(token, new URL("http://localhost")),
        (s) => s.remove(token, deviceId),
        (s) => s.rename(token, deviceId, "Oven"),
        (s) => s.find(token, deviceId),
        (s) => s.getAllDevices(token),
        (s) => s.executeAction(token, deviceId, DeviceActionId("action"), null)
    ]

    beforeEach(() => {
        const alwaysInvalidTokenUsersService = {
            verifyToken(): Effect.Effect<void, InvalidTokenError> {
                return Effect.fail({ __brand: "InvalidTokenError", message: "" })
            }
        } as unknown as UsersService
        service = new DevicesServiceImpl(repo, deviceFactory, alwaysInvalidTokenUsersService)
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
    const token = makeToken(UserRole.User)
    const allMethods: Array<(s: DevicesService) => Effect.Effect<unknown, unknown>> = [
        (s) => s.add(token, new URL("http://localhost")),
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
