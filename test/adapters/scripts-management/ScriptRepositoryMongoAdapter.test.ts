import mongoose from "mongoose";
import { testRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapterTests.js";
import { ScriptRepositoryMongoAdapter } from "../../../src/adapters/scripts-management/ScriptRepositoryMongoAdapter.js";
import { ScriptId, AutomationId, TaskId, Task, Automation } from "../../../src/domain/scripts-management/Script.js";
import { DeviceEventTrigger, PeriodTrigger, Trigger } from "../../../src/domain/scripts-management/Trigger.js";
import { DeviceId } from "../../../src/domain/devices-management/Device.js";

const dbName = "ScriptRepositoryMongoAdapterTests"

const collectionName = "scripts"

function makeTaskId(id: string): TaskId {
    return TaskId(id)
}
function makeAutomationId(id: string): AutomationId {
    return AutomationId(id)
}

function makeTaskEntity(id: string = "1", something: string = "Turn lights off"): Task {
    return Task(TaskId(id), something, [])
}
function makeAutomationEntity(id: string = "1", something: string = "a"): Automation {
    let trigger: Trigger
    if (something == "a") {
        trigger = PeriodTrigger(new Date(), 5)
    } else {
        trigger = DeviceEventTrigger(DeviceId("1"), "event")
    }
    return Automation(AutomationId(id), something, trigger, [])
}

function makeRepository(connection: mongoose.Connection): ScriptRepositoryMongoAdapter {
    return new ScriptRepositoryMongoAdapter(connection)
}
function idToSchemaId(id: ScriptId): string {
    return id
}

// Running tests here
describe("ScriptRepository with tasks", () =>
    testRepositoryMongoAdapter(dbName, collectionName, makeTaskId, makeTaskEntity, makeRepository, idToSchemaId)
)
describe("ScriptRepository with automations", () =>
    testRepositoryMongoAdapter(dbName, collectionName, makeAutomationId, makeAutomationEntity, makeRepository, idToSchemaId)
)
