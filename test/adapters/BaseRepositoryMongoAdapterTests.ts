import mongoose from "mongoose"
import { Effect } from "effect"
import { BaseRepositoryMongoAdapter } from "../../src/adapters/BaseRepositoryMongoAdapter.js"

/**
 * Tests the given repo
 * @param dbName Name of the DB that will be used to run tests
 * @param collectionName Name of the collection that the repository is expected to create
 * @param makeId Function that creates an entity id by a given string
 * @param makeEntity Function that creates an entity with the given id or random if that's not provided
 * @param makeRepository Function that creates an instance of the repository to test
 */
export function testRepositoryMongoAdapter<Id, Entity, SchemaId, Schema extends { _id: SchemaId }>(
    dbName: string,
    collectionName: string,
    makeId: (id: string) => Id,
    makeEntity: (id?: Id) => Entity,
    makeRepository: (connection: mongoose.Connection) => BaseRepositoryMongoAdapter<Id, Entity, SchemaId, Schema>,
    idToSchemaId: (id: Id) => SchemaId) {

    let repo: BaseRepositoryMongoAdapter<Id, Entity, SchemaId, Schema>
    let mongoDBConnection: mongoose.Connection

    beforeAll(async () => {
        mongoDBConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise()
        repo = makeRepository(mongoDBConnection)
    })

    beforeEach(async () => {
        const collections = await mongoDBConnection.listCollections()
        await Promise.all(collections.map(c => mongoDBConnection.dropCollection(c.name)))
        repo = makeRepository(mongoDBConnection)
    })

    test("repository is initially empty", async () => {
        const all = await Effect.runPromise(repo.getAll())
        expect(all).toHaveLength(0)
    })

    test("adding entity to repository makes it non empty", async () => {
        const countAfterAdding = await Effect.gen(function* () {
            yield* repo.add(makeEntity())
            return yield* repo.getAll()
        }).pipe(Effect.runPromise)

        expect(Array.from(countAfterAdding).length).toBe(1)
    })

    test("adding entity with already existing id produces DuplicateIdError", async () => {
        const id = makeId("1")
        const dg1 = makeEntity(id)
        const dg2 = makeEntity(id)

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
            const id = makeId("1")
            const dg = makeEntity(id)
            yield* repo.add(dg)
            const persistedDg = yield* repo.find(id)
            expect(persistedDg).toStrictEqual(dg)
        }).pipe(Effect.runPromise)
    })

    test("find returns NotFoundError if entity is not present", async () => {
        await repo.find(makeId("1"))
            .pipe(
                Effect.match({
                    onSuccess() { throw new Error("This operation should have failed") },
                    onFailure(error) { expect(error.__brand).toBe("NotFoundError") }
                }),
                Effect.runPromise
            )
    })

    test("A collection in mongodb is created with name DeviceGroups", async () => {
        await repo.add(makeEntity()).pipe(Effect.runPromise)
        const collection = (await mongoDBConnection.listCollections()).find(c => c.name == collectionName)
        expect(collection).toBeDefined()
    })

    test("Add actually persist entity in mongodb", async () => {
        const idValue = "1"
        const id = makeId(idValue)
        const dg = makeEntity(id)
        await repo.add(dg).pipe(Effect.runPromise)
        const persisted = await mongoDBConnection.collection(collectionName).findOne({ _id: idToSchemaId(id) as undefined }) // Don't ask me why
        expect(persisted).toBeDefined()
    })

    test("Remove removes entity if present", async () => {
        const id = makeId("1")
        const dg = makeEntity(id)

        const all = await Effect.gen(function* () {
            yield* repo.add(dg)
            yield* repo.remove(id)
            return yield* repo.getAll()
        }).pipe(Effect.runPromise)
        expect(all).toHaveLength(0)
    })

    test("Remove returns NotFoundError if entity was not present", async () => {
        const id = makeId("1")
        await repo.remove(id)
            .pipe(
                Effect.match({
                    onSuccess() { throw new Error("This operation should have failed") },
                    onFailure(error) { expect(error.__brand).toBe("NotFoundError") }
                }),
                Effect.runPromise
            )
    })

    // test("Updates correclty updates an entity", async () => {
    //     const newName = "Kitchen"
    //     const dg = makeDeviceGroup("1", "Bedroom")

    //     const updated = await Effect.gen(function* () {
    //         yield* repo.add(dg)
    //         dg.name = newName
    //         yield* repo.update(dg)
    //         return yield* repo.find(dg.id)
    //     }).pipe(Effect.runPromise)

    //     expect(updated.name).toBe(newName)
    // })

    test("Update returns NotFoundError if entity was not present", async () => {
        const dg = makeEntity()
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
}
