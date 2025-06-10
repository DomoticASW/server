import { Effect, pipe } from "effect"
import { DeviceId, Device, DeviceStatus, DevicePropertyId, DeviceProperty, DeviceAction, DeviceEvent, DeviceActionId, DeviceAddress } from "../../../src/domain/devices-management/Device.js"
import { UserRole, Token } from "../../../src/domain/users-management/Token.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { DevicesServiceImpl } from "../../../src/domain/devices-management/DevicesServiceImpl.js"
import { DeviceFactory } from "../../../src/ports/devices-management/DeviceFactory.js"
import { DeviceUnreachableError } from "../../../src/ports/devices-management/Errors.js"
import { DeviceRepository } from "../../../src/ports/devices-management/DeviceRepository.js"
import { IntRange, NoneInt } from "../../../src/domain/devices-management/Types.js"
import { InvalidTokenError } from "../../../src/ports/users-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UserService.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js"
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js"

let service: DevicesService
let deviceFactory: DeviceFactory
let repo: DeviceRepository
const deviceCommunicationProtocol: DeviceCommunicationProtocol = {
    executeDeviceAction: () => Effect.succeed(undefined),
} as unknown as DeviceCommunicationProtocol
const alwaysValidTokenUsersService = {
    verifyToken() {
        return Effect.succeed(null)
    }
} as unknown as UsersService
const freePermissionsService = {
    canExecuteActionOnDevice() {
        return Effect.succeed(null)
    }
} as unknown as PermissionsService

function makeToken(role: UserRole = UserRole.Admin): Token {
    return {
        userEmail: Email("ciccio.pasticcio@email.com"),
        role: role
    }
}

beforeEach(() => {
    repo = new InMemoryRepositoryMock((d) => d.id, (id) => id)
    deviceFactory = {
        create(deviceAddress: DeviceAddress): Effect.Effect<Device, DeviceUnreachableError> {
            const properties = [DeviceProperty(DevicePropertyId("prop"), "prop", 0, NoneInt())]
            const actions: DeviceAction<unknown>[] = []
            const events: DeviceEvent[] = []
            return Effect.succeed(Device(DeviceId(deviceAddress.toString()), "device", deviceAddress, DeviceStatus.Online, properties, actions, events))
        }
    }
    service = new DevicesServiceImpl(repo, deviceFactory, alwaysValidTokenUsersService, freePermissionsService, deviceCommunicationProtocol)
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

describe("executeAction", () => {
    const deviceId = DeviceId("1")
    const actionId = DeviceActionId("1")
    const userWithoutPermissionEmail = Email("sventurato@email.com")
    let receivedInput: unknown
    beforeEach(() => {
        deviceFactory = {
            create(deviceAddress: DeviceAddress): Effect.Effect<Device, DeviceUnreachableError> {
                const action = DeviceAction(actionId, "action", IntRange(0, 100))
                const d = Device(deviceId, "device", deviceAddress, DeviceStatus.Online, [], [action], [])
                return Effect.succeed({
                    id: d.id,
                    name: d.name,
                    address: d.address,
                    status: d.status,
                    properties: d.properties,
                    actions: d.actions,
                    events: d.events,
                    executeAction(actionId, input, comm) {
                        receivedInput = input
                        return d.executeAction(actionId, input, comm)
                    },
                })
            }
        }
        const permissionsService: PermissionsService = {
            canExecuteActionOnDevice(token: Token) {
                if (token.userEmail !== userWithoutPermissionEmail) return Effect.succeed(null)
                else return Effect.fail(PermissionError())
            }
        } as unknown as PermissionsService
        service = new DevicesServiceImpl(repo, deviceFactory, alwaysValidTokenUsersService, permissionsService, deviceCommunicationProtocol)
    })

    test("executes the given action on the given device with the given input", () => {
        const input = 4
        pipe(
            Effect.gen(function* () {
                yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
                yield* service.executeAction(makeToken(), deviceId, actionId, input)
                expect(receivedInput).toEqual(input)
            }),
            Effect.runSync
        )
    })

    test("throws if the action is not found on the device", () => {
        expect(() => pipe(
            Effect.gen(function* () {
                yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
                yield* service.executeAction(makeToken(), deviceId, DeviceActionId("nope"), 5)
            }),
            Effect.runSync
        )).toThrow("DeviceActionNotFound")
    })

    test("throws if the user executing the action has no permission to do so", () => {
        const token: Token = {
            userEmail: userWithoutPermissionEmail,
            role: UserRole.Admin
        }
        expect(() => pipe(
            Effect.gen(function* () {
                yield* service.add(token, DeviceAddress("localhost", 8080))
                yield* service.executeAction(token, deviceId, actionId, 5)
            }),
            Effect.runSync
        )).toThrow("PermissionError")
    })
})

describe("executeAutomationAction", () => {
    const deviceId = DeviceId("1")
    const actionId = DeviceActionId("1")
    let receivedInput: unknown
    beforeEach(() => {
        deviceFactory = {
            create(deviceAddress: DeviceAddress): Effect.Effect<Device, DeviceUnreachableError> {
                const action = DeviceAction(actionId, "action", IntRange(0, 100))
                const d = Device(deviceId, "device", deviceAddress, DeviceStatus.Online, [], [action], [])
                return Effect.succeed({
                    id: d.id,
                    name: d.name,
                    address: d.address,
                    status: d.status,
                    properties: d.properties,
                    actions: d.actions,
                    events: d.events,
                    executeAction(actionId, input, comm) {
                        receivedInput = input
                        return d.executeAction(actionId, input, comm)
                    },
                })
            }
        }
        service = new DevicesServiceImpl(repo, deviceFactory, alwaysValidTokenUsersService, freePermissionsService, deviceCommunicationProtocol)
    })

    test("executes the given action on the given device with the given input", () => {
        const input = 4
        pipe(
            Effect.gen(function* () {
                yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
                yield* service.executeAutomationAction(deviceId, actionId, input)
                expect(receivedInput).toEqual(input)
            }),
            Effect.runSync
        )
    })

    test("throws if the action is not found on the device", () => {
        expect(() => pipe(
            Effect.gen(function* () {
                yield* service.add(makeToken(), DeviceAddress("localhost", 8080))
                yield* service.executeAutomationAction(deviceId, DeviceActionId("nope"), 5)
            }),
            Effect.runSync
        )).toThrow("DeviceActionNotFound")
    })
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
        (s) => s.executeAction(token, deviceId, DeviceActionId("action"), undefined)
    ]

    beforeEach(() => {
        const alwaysInvalidTokenUsersService = {
            verifyToken(): Effect.Effect<void, InvalidTokenError> {
                return Effect.fail({ __brand: "InvalidTokenError", message: "" })
            }
        } as unknown as UsersService
        service = new DevicesServiceImpl(repo, deviceFactory, alwaysInvalidTokenUsersService, freePermissionsService, deviceCommunicationProtocol)
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
