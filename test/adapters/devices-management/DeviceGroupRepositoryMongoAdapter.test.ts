import mongoose from "mongoose";
import { DeviceGroupRepositoryMongoAdapter, DeviceGroupSchema } from "../../../src/adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { Option, pipe } from "effect";
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js";
import { testRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapterTests.js";

// Name of the DB that will be used to run tests
const dbName = "DeviceGroupRepositoryMongoAdapterTests"

// Name of the collection that the repository is expected to create
const collectionName = "devicegroups"

// Create an entityId dith
function makeId(id: string): DeviceGroupId {
    return DeviceGroupId(id)
}
function makeEntity(id?: string): DeviceGroup {
    const dgId = pipe(
        Option.fromNullable(id),
        Option.map(id => DeviceGroupId(id)),
        Option.getOrElse(() => DeviceGroupId("1"))
    )
    return DeviceGroup(dgId, "Bedroom")
}
function makeRepository(connection: mongoose.Connection): DeviceGroupRepositoryMongoAdapter {
    return new DeviceGroupRepositoryMongoAdapter(connection)
}
function idToSchemaId(id: DeviceGroupId): string {
    return id
}

testRepositoryMongoAdapter<DeviceGroupId, DeviceGroup, string, DeviceGroupSchema>(dbName, collectionName, makeId, makeEntity, makeRepository, idToSchemaId)
