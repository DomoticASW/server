import mongoose from "mongoose";
import { testRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapterTests.js";
import { ScriptRepositoryMongoAdapter } from "../../../src/adapters/scripts-management/ScriptRepositoryMongoAdapter.js";
import { ScriptId, AutomationId, TaskId, Task, Automation } from "../../../src/domain/scripts-management/Script.js";
import { DeviceEventTrigger, PeriodTrigger, Trigger } from "../../../src/domain/scripts-management/Trigger.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js";
<<<<<<< HEAD
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js";
=======
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, ElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js";
>>>>>>> ba73d42 (fix: fix BIG conflict)
import { Type } from "../../../src/ports/devices-management/Types.js";
import { Email } from "../../../src/domain/users-management/User.js";
import { BooleanEOperator, ColorEOperator, NumberEOperator, NumberGEOperator, NumberGOperator, NumberLEOperator, NumberLOperator, StringEOperator } from "../../../src/domain/scripts-management/Operators.js";
import { Condition, ConstantInstruction } from "../../../src/domain/scripts-management/Instruction.js";

const dbName = "ScriptRepositoryMongoAdapterTests"

const collectionName = "scripts"

function makeTaskId(id: string): TaskId {
    return TaskId(id)
}
function makeAutomationId(id: string): AutomationId {
    return AutomationId(id)
}

const instr1 = WaitInstruction(1)
const instr2 = WaitInstruction(2)
const constantA = CreateConstantInstruction("a", Type.IntType, 3) as ConstantInstruction<unknown>
const constantB = CreateConstantInstruction("b", Type.IntType, 2) as ConstantInstruction<unknown>

const instructions = [
    SendNotificationInstruction(Email("hello@email.com"), "message"),
    WaitInstruction(1),
    StartTaskInstruction(TaskId("1")),
    DeviceActionInstruction(DeviceId("1"), DeviceActionId("1"), 4),
    CreateConstantInstruction("x", Type.DoubleType, 3.14),
    CreateDevicePropertyConstantInstruction("y", Type.IntType, DeviceId("1"), DevicePropertyId("1")),
    instr1,
    instr2,
    constantA,
    constantB,
    IfInstruction([instr1, instr2], Condition(constantA, constantB, NumberEOperator())),
<<<<<<< HEAD
    IfElseInstruction([instr1], [instr2], Condition(constantA, constantB, NumberGEOperator(), true)),
=======
    ElseInstruction([instr1], [instr2], Condition(constantA, constantB, NumberGEOperator(), true)),
>>>>>>> ba73d42 (fix: fix BIG conflict)
    // All other condition operators
    IfInstruction([], Condition(constantA, constantB, NumberLEOperator())),
    IfInstruction([], Condition(constantA, constantB, NumberLOperator())),
    IfInstruction([], Condition(constantA, constantB, NumberGOperator())),
    IfInstruction([], Condition(constantA, constantB, StringEOperator())),
    IfInstruction([], Condition(constantA, constantB, ColorEOperator())),
    IfInstruction([], Condition(constantA, constantB, BooleanEOperator()))
]

function makeTaskEntity(id: string = "1", something: string = "Turn lights off"): Task {
    return Task(TaskId(id), something, instructions)
}
function makeAutomationEntity(id: string = "1", something: string = "a"): Automation {
    let trigger: Trigger
    if (something == "a") {
        trigger = PeriodTrigger(new Date(), 5)
    } else {
        trigger = DeviceEventTrigger(DeviceId("1"), "event")
    }
    return Automation(AutomationId(id), something, trigger, instructions)
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
