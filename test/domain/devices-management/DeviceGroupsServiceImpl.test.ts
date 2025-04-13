import { DeviceGroupsService } from "../../../src/ports/devices-management/DeviceGroupsService.js"
import { DeviceGroupsServiceImpl } from "../../../src/domain/devices-management/DeviceGroupsServiceImpl.js"
import { Token, UserRole } from "../../../src/domain/users-management/Token.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { Effect, pipe } from "effect"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js"

let service: DeviceGroupsService
let repo: InMemoryRepositoryMock<DeviceGroupId, DeviceGroup>

function makeToken(): Token {
    return {
        userEmail: Email("ciccio.pasticcio@email.com"),
        role: UserRole.Admin
    }
}

beforeEach(() => {
    repo = new InMemoryRepositoryMock((d) => d.id)
    service = new DeviceGroupsServiceImpl(repo)
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
    expect(dg.id).toBe(name)
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
            yield* service.addGroup(makeToken(), name)
            return yield* service.findGroup(makeToken(), DeviceGroupId(name))
        }),
        Effect.runPromise
    )
    expect(repo.callsToFind).toBe(1)
    expect(dg.name).toBe(name)
})

test("find fails if no device group is found", async () => {
    await pipe(
        service.findGroup(makeToken(), DeviceGroupId("Bedroom")),
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
            yield* service.addGroup(makeToken(), name)
            const dgsBefore = yield* service.getAllDeviceGroups(makeToken())
            yield* service.removeGroup(makeToken(), DeviceGroupId(name))
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
        service.removeGroup(makeToken(), DeviceGroupId("Bedroom")),
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(e) { expect(e.__brand).toBe("DeviceGroupNotFoundError") }
        }),
        Effect.runPromise
    )
})
