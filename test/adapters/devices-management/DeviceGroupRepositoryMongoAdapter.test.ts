import mongoose from "mongoose";
import { DeviceGroupRepositoryMongoAdapter, DeviceGroupSchema } from "../../../src/adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { Option, pipe } from "effect";
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js";
import { testRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapterTests.js";

const dbName = "DeviceGroupRepositoryMongoAdapterTests"

const collectionName = "devicegroups"

function makeId(id: string): DeviceGroupId {
    return DeviceGroupId(id)
}
function makeEntity(id?: string, something?: string): DeviceGroup {
    const dgId = pipe(
        Option.fromNullable(id),
        Option.map(id => DeviceGroupId(id)),
        Option.getOrElse(() => DeviceGroupId("1"))
    )
    const dgName = pipe(
        Option.fromNullable(something),
        Option.getOrElse(() => "Bedroom")
    )
    return DeviceGroup(dgId, dgName)
}
function makeRepository(connection: mongoose.Connection): DeviceGroupRepositoryMongoAdapter {
    return new DeviceGroupRepositoryMongoAdapter(connection)
}
function idToSchemaId(id: DeviceGroupId): string {
    return id
}

// Running tests here
testRepositoryMongoAdapter<DeviceGroupId, DeviceGroup, string, DeviceGroupSchema>(dbName, collectionName, makeId, makeEntity, makeRepository, idToSchemaId)

// Add any other subclass-specific tests here
