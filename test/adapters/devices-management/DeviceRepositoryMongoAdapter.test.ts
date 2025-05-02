import mongoose from "mongoose";
import { DeviceRepositoryMongoAdapter, DeviceSchema } from "../../../src/adapters/devices-management/DeviceRepositoryMongoAdapter.js";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus } from "../../../src/domain/devices-management/Device.js";
import { testRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapterTests.js";
import { Color, Enum, IntRange, NoneBoolean, NoneColor, NoneVoid } from "../../../src/domain/devices-management/Types.js";

const dbName = "DeviceRepositoryMongoAdapterTests"

const collectionName = "devices"

function makeId(id: string): DeviceId {
    return DeviceId(id)
}
function makeEntity(id: string = "1", something: string = "Bedroom"): Device {
    const actions = [
        DeviceAction(DeviceActionId("1"), "Turn on", NoneVoid(), "Turns on the light"),
        DeviceAction(DeviceActionId("2"), "Set brightness", IntRange(0, 100)),
        DeviceAction(DeviceActionId("3"), "Set light temperature", Enum(new Set(["Cold", "Warm"])))
    ]
    const properties = [
        DeviceProperty(DevicePropertyId("1"), "On", true, NoneBoolean()),
        DeviceProperty(DevicePropertyId("2"), "Brightness", 20, actions[1] as DeviceAction<number>),
        DeviceProperty(DevicePropertyId("3"), "Light temperature", "Cold", actions[2] as DeviceAction<string>),
        DeviceProperty(DevicePropertyId("4"), "Color", Color(0, 255, 255), NoneColor()),
    ]
    const events = [DeviceEvent("Turn on"), DeviceEvent("Turn off")]
    return Device(DeviceId(id), something, new URL("http://localhost"), DeviceStatus.Online, properties, actions, events)
}
function makeRepository(connection: mongoose.Connection): DeviceRepositoryMongoAdapter {
    return new DeviceRepositoryMongoAdapter(connection)
}
function idToSchemaId(id: DeviceId): string {
    return id
}

// Running tests here
testRepositoryMongoAdapter<DeviceId, Device, string, DeviceSchema>(dbName, collectionName, makeId, makeEntity, makeRepository, idToSchemaId)
