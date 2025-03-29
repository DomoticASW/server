import mongoose from "mongoose";
import { DeviceGroupRepository } from "../../../src/ports/devices-management/DeviceGroupRepository.js";
import { DeviceGroupRepositoryMongoAdapter } from "../../../src/adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { Effect } from "effect";
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js";

const dbName = "DeviceGroupRepositoryMongoAdapterTests"
const collectionName = "devicegroups"
let repo: DeviceGroupRepository
let mongoDBConnection: mongoose.Connection

function makeDeviceGroup(id: string = "1", name: string = "Bedroom") {
    return DeviceGroup(DeviceGroupId(id), name)
}

beforeAll(async () => {
    mongoDBConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise()
    repo = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
})

beforeEach(async () => {
    const collections = await mongoDBConnection.listCollections()
    await Promise.all(collections.map(c => mongoDBConnection.dropCollection(c.name)))
    repo = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
})

test("repository is initially empty", async () => {
    const all = await Effect.runPromise(repo.getAll())
    expect(all).toHaveLength(0)
})

test("adding entity to repository makes it non empty", async () => {
    const countAfterAdding = await Effect.gen(function* () {
        yield* repo.add(DeviceGroup(DeviceGroupId("1"), "Bedroom"))
        return yield* repo.getAll()
    }).pipe(Effect.runPromise)

    expect(Array.from(countAfterAdding).length).toBe(1)
})

test("adding entity with already existing id produces DuplicateIdError", async () => {
    const id = DeviceGroupId("1")
    const dg1 = DeviceGroup(id, "Bedroom")
    const dg2 = DeviceGroup(id, "Bedroom")

    await Effect.gen(function* () {
        yield* repo.add(dg1)
        yield* repo.add(dg2)
    }).pipe(
        Effect.match({
            onSuccess() { throw new Error("This operation should have failed") },
            onFailure(error) { expect(error.__brand).toBe("DuplicateIdError") }
        }),
        Effect.runPromise
    )

    const all = Array.from(await repo.getAll().pipe(Effect.runPromise))
    expect(all.at(0)).toEqual(dg1)
    expect(all.length).toBe(1)
})

test("find returns entity if present", async () => {
    await Effect.gen(function* () {
        const id = DeviceGroupId("1")
        const dg = DeviceGroup(id, "Bedroom")
        yield* repo.add(dg)
        const persistedDg = yield* repo.find(id)
        expect(persistedDg).toStrictEqual(dg)
    }).pipe(Effect.runPromise)
})

test("find returns NotFoundError if entity is not present", async () => {
    await repo.find(DeviceGroupId("1"))
        .pipe(
            Effect.match({
                onSuccess() { throw new Error("This operation should have failed") },
                onFailure(error) { expect(error.__brand).toBe("NotFoundError") }
            }),
            Effect.runPromise
        )
})

test("A collection in mongodb is created with name DeviceGroups", async () => {
    await repo.add(makeDeviceGroup()).pipe(Effect.runPromise)
    const collection = (await mongoDBConnection.listCollections()).find(c => c.name == collectionName)
    expect(collection).toBeDefined()
})

test("Add actually persist entity in mongodb", async () => {
    const dg = makeDeviceGroup()
    await repo.add(dg).pipe(Effect.runPromise)
    const persisted = await mongoDBConnection.collection(collectionName).findOne({ _id: dg.id })
    expect(persisted).toBeDefined()
})

test("Remove removes entity if present", async () => {
    const id = DeviceGroupId("1")
    const dg = DeviceGroup(id, "Bedroom")

    const all = await Effect.gen(function* () {
        yield* repo.add(dg)
        yield* repo.remove(id)
        return yield* repo.getAll()
    }).pipe(Effect.runPromise)
    expect(all).toHaveLength(0)
})

test("Remove returns NotFoundError if entity was not present", async () => {
    const id = DeviceGroupId("1")
    await repo.remove(id)
        .pipe(
            Effect.match({
                onSuccess() { throw new Error("This operation should have failed") },
                onFailure(error) { expect(error.__brand).toBe("NotFoundError") }
            }),
            Effect.runPromise
        )
})

test("Updates correclty updates an entity", async () => {
    const newName = "Kitchen"
    const dg = makeDeviceGroup("1", "Bedroom")

    const updated = await Effect.gen(function* () {
        yield* repo.add(dg)
        dg.name = newName
        yield* repo.update(dg)
        return yield* repo.find(dg.id)
    }).pipe(Effect.runPromise)

    expect(updated.name).toBe(newName)
})

test("Update returns NotFoundError if entity was not present", async () => {
    const dg = makeDeviceGroup()
    await repo.update(dg)
        .pipe(
            Effect.match({
                onSuccess() { throw new Error("This operation should have failed") },
                onFailure(error) { expect(error.__brand).toBe("NotFoundError") }
            }),
            Effect.runPromise
        )
})

afterAll(async () => {
    await mongoDBConnection.close()
})
