import mongoose from "mongoose";
import { DeviceGroupRepositoryMongoAdapter, DeviceGroupSchema } from "../../../src/adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { Effect, pipe } from "effect";
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js";
import { testRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapterTests.js";
import { DeviceId } from "../../../src/domain/devices-management/Device.js";
import { Repository } from "../../../src/ports/Repository.js";

const dbName = "DeviceGroupRepositoryMongoAdapterTests"

const collectionName = "devicegroups"

function makeId(id: string): DeviceGroupId {
    return DeviceGroupId(id)
}
function makeEntity(id: string = "1", something: string = "Bedroom", devices: DeviceId[] = []): DeviceGroup {
    return DeviceGroup(DeviceGroupId(id), something, devices)
}
function makeRepository(connection: mongoose.Connection): DeviceGroupRepositoryMongoAdapter {
    return new DeviceGroupRepositoryMongoAdapter(connection)
}
function idToSchemaId(id: DeviceGroupId): string {
    return id
}

const otherTests = (conn: () => mongoose.Connection, repo: () => Repository<DeviceGroupId, DeviceGroup>) => {
    test("DeviceGroup devices are persisted", async () => {
        const devices = [DeviceId("3"), DeviceId("hello")]
        const dg = makeEntity(undefined, undefined, devices)
        const persistedDg = await pipe(
            Effect.gen(function* () {
                yield* repo().add(dg)
                return yield* repo().find(dg.id)
            }),
            Effect.runPromise
        )
        expect(persistedDg.devices).toEqual(devices)
    })
}

// Running tests here
testRepositoryMongoAdapter<DeviceGroupId, DeviceGroup, string, DeviceGroupSchema>(dbName, collectionName, makeId, makeEntity, makeRepository, idToSchemaId, otherTests)
