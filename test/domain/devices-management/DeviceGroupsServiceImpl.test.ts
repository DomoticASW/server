import { DeviceGroupsService } from "../../../src/ports/devices-management/DeviceGroupsService.js"
import { DeviceGroupsServiceImpl } from "../../../src/domain/devices-management/DeviceGroupsServiceImpl.js"
import { Token, UserRole } from "../../../src/domain/users-management/Token.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { Effect, Either, pipe } from "effect"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js"
import * as uuid from "uuid";
import { Device, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UserService.js"
import { InvalidTokenError, UnauthorizedError } from "../../../src/ports/users-management/Errors.js"

let service: DeviceGroupsService
let devicesService: DevicesService
let repo: InMemoryRepositoryMock<DeviceGroupId, DeviceGroup>

function makeToken(role: UserRole = UserRole.Admin): Token {
    return {
        userEmail: Email("ciccio.pasticcio@email.com"),
        role: role
    }
}

beforeEach(() => {
    repo = new InMemoryRepositoryMock((d) => d.id, (dg1, dg2) => dg1.name != dg2.name)
    devicesService = {
        add: () => Effect.succeed(DeviceId("1")),
        remove: () => Effect.succeed(null),
        executeAction: () => Effect.succeed(null),
        getAllDevices: () => Effect.succeed([]),
        find(token, id) {
            if (id == DeviceId("1"))
                return Effect.succeed(Device(DeviceId("1"), "Lamp", new URL("localhost:8080"), DeviceStatus.Online, [], [], []))
            else
                return Effect.fail(DeviceNotFoundError())
        },
        executeAutomationAction: () => Effect.succeed(null),
        rename: () => Effect.succeed(null),
        subscribeForDevicePropertyUpdates: () => Effect.succeed(null),
        unsubscribeForDevicePropertyUpdates: () => Effect.succeed(null),
        updateDeviceProperty: () => Effect.succeed(null),
    }
    const alwaysValidTokenUsersService = {
        verifyToken() {
            return Effect.succeed(null)
        }
    } as unknown as UsersService
    service = new DeviceGroupsServiceImpl(repo, devicesService, alwaysValidTokenUsersService)
})

test("getAll retrieves all device groups from the repository", async () => {
    expect(repo.callsToGetAll).toBe(0)
    const [expected, actual] = await pipe(
        Effect.all([
            repo.getAll(),
            service.getAllDeviceGroups(makeToken())
        ]),
        Effect.runPromise
    )
    expect(repo.callsToGetAll).toBe(2) // 1 + 1 made by the test
    expect(expected).toEqual(actual)
})

test("add method actually saves to the repository", async () => {
    expect(repo.callsToAdd).toBe(0)
    await pipe(
        service.addGroup(makeToken(), "Bedroom"),
        Effect.runPromise
    )
    expect(repo.callsToAdd).toBe(1)
})

test("add method adds a group given a group name with empty devices", async () => {
    const name = "Bedroom"
    const dgs = await pipe(
        Effect.gen(function* () {
            yield* service.addGroup(makeToken(), name)
            return yield* service.getAllDeviceGroups(makeToken())
        }),
        Effect.map(dgs => Array.from(dgs)),
        Effect.runPromise
    )
    expect(dgs.length).toBe(1)
    const dg = dgs[0]
    expect(uuid.validate(dg.id)).toBeTruthy()
    expect(dg.name).toBe(name)
    expect(dg.devices).toEqual([])
})

test("cannot add a group if name already in use", async () => {
    const name = "group1"
    await pipe(
        Effect.gen(function* () {
            yield* service.addGroup(makeToken(), name)
            yield* service.addGroup(makeToken(), name)
        }),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNameAlreadyInUseError") }
        }),
        Effect.runPromise
    )
})

test("find method actually searches into the repository", async () => {
    const name = "Bedroom"
    expect(repo.callsToFind).toBe(0)
    const dg = await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), name)
            return yield* service.findGroup(makeToken(), id)
        }),
        Effect.runPromise
    )
    expect(repo.callsToFind).toBe(1)
    expect(dg.name).toBe(name)
})

test("find fails if no device group is found", async () => {
    await pipe(
        service.findGroup(makeToken(), DeviceGroupId("12345")),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNotFoundError") }
        }),
        Effect.runPromise
    )
})

test("removeGroup removes a group from the repository", async () => {
    const name = "Bedroom"
    expect(repo.callsToRemove).toBe(0)
    const [initialCount, finalCount] = await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), name)
            const dgsBefore = yield* service.getAllDeviceGroups(makeToken())
            yield* service.removeGroup(makeToken(), id)
            const dgsAfter = yield* service.getAllDeviceGroups(makeToken())
            return [Array.from(dgsBefore).length, Array.from(dgsAfter).length]
        }),
        Effect.runPromise
    )
    expect(repo.callsToRemove).toBe(1)
    expect(finalCount).toBe(initialCount - 1)
})

test("removeGroup fails if no group is found", async () => {
    await pipe(
        service.removeGroup(makeToken(), DeviceGroupId("1234")),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNotFoundError") }
        }),
        Effect.runPromise
    )
})

test("renameGroup renames an existing group", async () => {
    const name1 = "Bedroom"
    const name2 = "Kitchen"
    expect(repo.callsToUpdate).toBe(0)
    await pipe(
        Effect.gen(function* () {
            yield* service.addGroup(makeToken(), name1)
            const id = yield* service.addGroup(makeToken(), name2)
            yield* service.renameGroup(makeToken(), id, name1)
        }),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNameAlreadyInUseError") }
        }),
        Effect.runPromise
    )
    expect(repo.callsToUpdate).toBe(1)
})

test("renameGroup fails in case of new name already in use", async () => {
    const name1 = "Bedroom"
    const name2 = "Kitchen"
    const updatedDG = await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), name1)
            yield* service.renameGroup(makeToken(), id, name2)
            return yield* service.findGroup(makeToken(), id)
        }),
        Effect.runPromise
    )
    expect(updatedDG.name).toBe(name2)
})

test("renameGroup fails if group not found", async () => {
    const id = DeviceGroupId("12345")
    await pipe(
        service.renameGroup(makeToken(), id, "newname"),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNotFoundError") }
        }),
        Effect.runPromise
    )
})

test("addDeviceToGroup adds a new device to a group", async () => {
    expect(repo.callsToUpdate).toBe(0)
    const deviceId = DeviceId("1")
    const dg = await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), "Bedroom")
            yield* service.addDeviceToGroup(makeToken(), deviceId, id)
            return yield* service.findGroup(makeToken(), id)
        }),
        Effect.runPromise
    )
    expect(dg.devices).toContainEqual(deviceId)
    expect(repo.callsToUpdate).toBe(1)
})

test("addDeviceToGroup fails if group not found", async () => {
    const id = DeviceGroupId("12345")
    const deviceId = DeviceId("1")
    await pipe(
        service.addDeviceToGroup(makeToken(), deviceId, id),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNotFoundError") }
        }),
        Effect.runPromise
    )
})

test("addDeviceToGroup fails if device not found", async () => {
    const deviceId = DeviceId("999")
    await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), "Bedroom")
            yield* service.addDeviceToGroup(makeToken(), deviceId, id)
        }),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceNotFoundError") }
        }),
        Effect.runPromise
    )
})

test("removeDeviceFromGroup removes device from a group", async () => {
    expect(repo.callsToUpdate).toBe(0)
    const deviceId = DeviceId("1")
    const dg = await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), "Bedroom")
            yield* service.addDeviceToGroup(makeToken(), deviceId, id)
            yield* service.removeDeviceFromGroup(makeToken(), deviceId, id)
            return yield* service.findGroup(makeToken(), id)
        }),
        Effect.runPromise
    )
    expect(dg.devices).toHaveLength(0)
    expect(repo.callsToUpdate).toBe(2) // 1 + 1 of adding the device
})

test("removeDeviceFromGroup succedes if device was not part of the group", async () => {
    expect(repo.callsToUpdate).toBe(0)
    const deviceId = DeviceId("1")
    const dg = await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), "Bedroom")
            yield* service.removeDeviceFromGroup(makeToken(), deviceId, id)
            return yield* service.findGroup(makeToken(), id)
        }),
        Effect.runPromise
    )
    expect(dg.devices).toHaveLength(0)
    expect(repo.callsToUpdate).toBe(1)
})

test("removeDeviceFromGroup fails if group not found", async () => {
    const id = DeviceGroupId("12345")
    const deviceId = DeviceId("1")
    await pipe(
        service.removeDeviceFromGroup(makeToken(), deviceId, id),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNotFoundError") }
        }),
        Effect.runPromise
    )
})

test("removeDeviceFromGroup fails if device not found", async () => {
    const deviceId = DeviceId("999")
    await pipe(
        Effect.gen(function* () {
            const id = yield* service.addGroup(makeToken(), "Bedroom")
            yield* service.removeDeviceFromGroup(makeToken(), deviceId, id)
        }),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceNotFoundError") }
        }),
        Effect.runPromise
    )
})

describe("all methods fail if the token is invalid", () => {
    const allMethods: Array<(s: DeviceGroupsService) => Effect.Effect<unknown, unknown>> = [
        (s) => s.addGroup(makeToken(), "group"),
        (s) => s.removeGroup(makeToken(), DeviceGroupId("1")),
        (s) => s.renameGroup(makeToken(), DeviceGroupId("1"), "group"),
        (s) => s.findGroup(makeToken(), DeviceGroupId("1")),
        (s) => s.getAllDeviceGroups(makeToken()),
        (s) => s.addDeviceToGroup(makeToken(), DeviceId("1"), DeviceGroupId("1")),
        (s) => s.removeDeviceFromGroup(makeToken(), DeviceId("1"), DeviceGroupId("1")),
    ]

    beforeEach(() => {
        const alwaysInvalidTokenUsersService = {
            verifyToken(): Effect.Effect<void, InvalidTokenError> {
                return Effect.fail({ __brand: "InvalidTokenError", message: "" })
            }
        } as unknown as UsersService
        service = new DeviceGroupsServiceImpl(repo, devicesService, alwaysInvalidTokenUsersService)
    })

    allMethods.forEach(m => {
        test(m.toString(), async () => {
            const res = await pipe(
                m(service),
                Effect.either,
                Effect.runPromise
            ) as Either.Either<unknown, InvalidTokenError>
            expect(Either.isLeft(res)).toBeTruthy()
            expect(pipe(
                Either.flip(res),
                Either.getOrThrow
            ).__brand).toBe("InvalidTokenError")
        })
    })
})

