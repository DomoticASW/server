import mongoose, { Document, Model, Schema } from "mongoose";
import { Automation, AutomationId, Script, ScriptId, Task, TaskId } from "../../domain/scripts-management/Script.js";
import { BaseRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapter.js";
import { DeviceEventTrigger, PeriodTrigger } from "../../domain/scripts-management/Trigger.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../domain/devices-management/Device.js";
import { Type } from "../../ports/devices-management/Types.js";
import { Condition, ConditionOperator, ConstantInstruction, Instruction, isCreateConstantInstruction, isCreateDevicePropertyConstantInstruction, isDeviceActionInstruction, isIfElseInstruction, isIfInstruction, isSendNotificationInstruction, isStartTaskInstruction, isWaitInstruction } from "../../domain/scripts-management/Instruction.js";
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "../../domain/scripts-management/InstructionImpl.js";
import { BooleanEOperator, ColorEOperator, isBooleanEOperator, isColorEOperator, isNumberEOperator, isNumberGEOperator, isNumberGOperator, isNumberLEOperator, isNumberLOperator, isStringEOperator, NumberEOperator, NumberGEOperator, NumberGOperator, NumberLEOperator, NumberLOperator, StringEOperator } from "../../domain/scripts-management/Operators.js";
import { Email } from "../../domain/users-management/User.js";
import { ScriptRepository } from "../../ports/scripts-management/ScriptRepository.js";

enum ScriptType {
    Task = "Task",
    Automation = "Automation"
}

interface ScriptSchema {
    _id: string
    name: string

    instructions: InstructionSchema[]

    scriptType: ScriptType
    automationData?: AutomationDataSchema
}

interface AutomationDataSchema {
    enabled: boolean
    trigger: TriggerSchema
}

enum TriggerType {
    Period = "Period",
    DeviceEvent = "DeviceEvent"
}

interface TriggerSchema {
    triggerType: TriggerType
    trigger: PeriodTriggerSchema | DeviceEventTriggerSchema
}

interface PeriodTriggerSchema {
    start: Date
    periodSeconds: number
}

interface DeviceEventTriggerSchema {
    deviceId: string
    eventName: string
}

enum InstructionType {
    SendNotificationInstruction = "SendNotificationInstruction",
    WaitInstruction = "WaitInstruction",
    StartTaskInstruction = "StartTaskInstruction",
    DeviceActionInstruction = "DeviceActionInstruction",
    CreateConstantInstruction = "CreateConstantInstruction",
    CreateDevicePropertyConstantInstruction = "CreateDevicePropertyConstantInstruction",
    IfInstruction = "IfInstruction",
    IfElseInstruction = "IfElseInstruction"
}

interface InstructionSchema {
    type: InstructionType
    instruction: SendNotificationInstructionSchema | WaitInstructionSchema | StartTaskInstructionSchema | DeviceActionInstructionSchema | CreateConstantInstructionSchema | CreateDevicePropertyConstantInstructionSchema | IfInstructionSchema | IfElseInstructionSchema
}

interface SendNotificationInstructionSchema {
    email: string
    message: string
}

interface WaitInstructionSchema {
    seconds: number
}

interface StartTaskInstructionSchema {
    taskId: string
}

interface DeviceActionInstructionSchema {
    deviceId: string
    deviceActionId: string
    input: unknown
}

interface ConstantInstructionSchema {
    name: string
    type: Type
}

interface CreateConstantInstructionSchema extends ConstantInstructionSchema {
    value: unknown
}

interface CreateDevicePropertyConstantInstructionSchema extends ConstantInstructionSchema {
    deviceId: string
    devicePropertyId: string
}

interface IfInstructionSchema {
    then: InstructionSchema[]
    condition: ConditionSchema
}

interface IfElseInstructionSchema extends IfInstructionSchema {
    else: InstructionSchema[]
}

interface ConditionSchema {
    leftConstantName: string
    rightConstantName: string
    negate: boolean
    conditionOperatorType: ConditionOperatorType
}

enum ConditionOperatorType {
    NumberEOperator = "NumberEOperator",
    NumberGEOperator = "NumberGEOperator",
    NumberLEOperator = "NumberLEOperator",
    NumberLOperator = "NumberLOperator",
    NumberGOperator = "NumberGOperator",
    StringEOperator = "StringEOperator",
    ColorEOperator = "ColorEOperator",
    BooleanEOperator = "BooleanEOperator"
}

export class ScriptRepositoryMongoAdapter extends BaseRepositoryMongoAdapter<ScriptId, Script<ScriptId>, string, ScriptSchema> implements ScriptRepository {
    private triggerSchema = new mongoose.Schema<TriggerSchema>({
        triggerType: { type: String, enum: TriggerType, required: true },
        trigger: { type: Schema.Types.Mixed, required: true }
    });
    private automationDataSchema = new mongoose.Schema<AutomationDataSchema>({
        enabled: { type: Boolean, required: true },
        trigger: { type: this.triggerSchema, required: true }
    });
    private instructionSchema = new mongoose.Schema<InstructionSchema>({
        type: { type: String, enum: InstructionType, required: true },
        instruction: { type: Schema.Types.Mixed, required: true }
    });
    private scriptSchema = new mongoose.Schema<ScriptSchema>({
        _id: { type: String, required: true },
        name: { type: String, required: true, unique: true },
        scriptType: { type: String, enum: ScriptType, required: true },
        instructions: { type: [this.instructionSchema], required: true },
        automationData: { type: this.automationDataSchema, required: false }
    });

    private Script: mongoose.Model<ScriptSchema>

    constructor(connection: mongoose.Connection) {
        super(connection)
        this.Script = connection.model("Script", this.scriptSchema, undefined, { overwriteModels: true })
    }

    protected toDocument(e: Script<ScriptId>): Document<unknown, object, ScriptSchema> & ScriptSchema {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function isAutomation(obj: any): obj is Automation {
            return typeof obj == "object" && "enabled" in obj && "trigger" in obj
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function isPeriodTrigger(obj: any): obj is PeriodTrigger {
            return typeof obj == "object" && "start" in obj && "periodSeconds" in obj
        }
        let scriptType: ScriptType = ScriptType.Task
        let automationData: AutomationDataSchema | undefined = undefined
        if (isAutomation(e)) {
            scriptType = ScriptType.Automation
            const triggerType = isPeriodTrigger(e.trigger) ? TriggerType.Period : TriggerType.DeviceEvent
            const trigger: TriggerSchema = { triggerType: triggerType, trigger: e.trigger }
            automationData = { enabled: e.enabled, trigger: trigger }
        }
        return new this.Script({ _id: e.id, name: e.name, scriptType: scriptType, instructions: this.serializeInstructions(e.instructions), automationData: automationData })
    }

    protected toEntity(s: ScriptSchema): Script<ScriptId> {
        let trigger: PeriodTrigger | DeviceEventTrigger
        const instructions: Instruction[] = this.deserializeInstructions(s.instructions, s.instructions)
        switch (s.scriptType) {
            case ScriptType.Automation:
                if (s.automationData!.trigger.triggerType == TriggerType.Period) {
                    const t = s.automationData!.trigger.trigger as PeriodTriggerSchema
                    trigger = PeriodTrigger(t.start, t.periodSeconds)
                } else {
                    const t = s.automationData!.trigger.trigger as DeviceEventTriggerSchema
                    trigger = DeviceEventTrigger(DeviceId(t.deviceId), t.eventName)
                }
                return Automation(AutomationId(s._id), s.name, trigger, instructions, s.automationData!.enabled)
            case ScriptType.Task:
                return Task(TaskId(s._id), s.name, instructions)
        }
    }

    protected model(): Model<ScriptSchema> {
        return this.Script
    }

    private serializeInstructions(instructions: Instruction[]): InstructionSchema[] {
        return instructions.map(i => {
            let instruction: SendNotificationInstructionSchema | WaitInstructionSchema | StartTaskInstructionSchema | DeviceActionInstructionSchema | CreateConstantInstructionSchema | CreateDevicePropertyConstantInstructionSchema | IfInstructionSchema | IfElseInstructionSchema
            let type: InstructionType
            if (isSendNotificationInstruction(i)) {
                instruction = { email: i.email, message: i.message }
                type = InstructionType.SendNotificationInstruction
            } else if (isStartTaskInstruction(i)) {
                instruction = { taskId: i.taskId }
                type = InstructionType.StartTaskInstruction
            } else if (isWaitInstruction(i)) {
                instruction = { seconds: i.seconds }
                type = InstructionType.WaitInstruction
            } else if (isDeviceActionInstruction(i)) {
                instruction = { deviceId: i.deviceId, deviceActionId: i.deviceActionId, input: i.input }
                type = InstructionType.DeviceActionInstruction
            } else if (isIfInstruction(i) && !isIfElseInstruction(i)) {
                instruction = { then: this.serializeInstructions(i.then), condition: this.serializeCondition(i.condition) }
                type = InstructionType.IfInstruction
            } else if (isIfElseInstruction(i)) {
                instruction = { then: this.serializeInstructions(i.then), else: this.serializeInstructions(i.else), condition: this.serializeCondition(i.condition) }
                type = InstructionType.IfElseInstruction
            } else if (isCreateDevicePropertyConstantInstruction(i)) {
                instruction = { name: i.name, type: i.type, deviceId: i.deviceId, devicePropertyId: i.devicePropertyId }
                type = InstructionType.CreateDevicePropertyConstantInstruction
            } else if (isCreateConstantInstruction(i)) {
                instruction = { name: i.name, type: i.type, value: i.value }
                type = InstructionType.CreateConstantInstruction
            } else {
                throw new Error("It was not possible to serialize the following instruction into a known type of instruction:\n" + JSON.stringify(i))
            }
            return { instruction: instruction, type: type }
        })
    }
    private deserializeInstructions(instructions: InstructionSchema[], superInstructions: InstructionSchema[]): Instruction[] {
        return instructions.map(instruction => {
            switch (instruction.type) {
                case InstructionType.SendNotificationInstruction: {
                    const i = instruction.instruction as unknown as SendNotificationInstructionSchema
                    return SendNotificationInstruction(Email(i.email), i.message)
                }
                case InstructionType.StartTaskInstruction: {
                    const i = instruction.instruction as unknown as StartTaskInstructionSchema
                    return StartTaskInstruction(TaskId(i.taskId))
                }
                case InstructionType.WaitInstruction: {
                    const i = instruction.instruction as unknown as WaitInstructionSchema
                    return WaitInstruction(i.seconds)
                }
                case InstructionType.DeviceActionInstruction: {
                    const i = instruction.instruction as unknown as DeviceActionInstructionSchema
                    return DeviceActionInstruction(DeviceId(i.deviceId), DeviceActionId(i.deviceActionId), i.input)
                }
                case InstructionType.IfInstruction:
                case InstructionType.IfElseInstruction: {
                    const i = instruction.instruction as unknown as IfInstructionSchema
                    // Fiding the constant instructions
                    // These are safely unwrapped, the constants must be present as the script compiled when it was created
                    const [leftConstantInstructionSchema, leftConstantInstructionSchemaType] = this.findConstantInstructionSchemaByName(superInstructions, i.condition.leftConstantName)!
                    const [rightConstantInstructionSchema, rightConstantInstructionSchemaType] = this.findConstantInstructionSchemaByName(superInstructions, i.condition.rightConstantName)!
                    // Deserializing constant instructions
                    const leftConstantInstruction = this.deserializeConstantInstruction(leftConstantInstructionSchema, leftConstantInstructionSchemaType)
                    const rightConstantInstruction = this.deserializeConstantInstruction(rightConstantInstructionSchema, rightConstantInstructionSchemaType)
                    const conditionOperator = this.deserializeConditionOperator(i.condition.conditionOperatorType)

                    if (instruction.type == InstructionType.IfInstruction) {
                        return IfInstruction(this.deserializeInstructions(i.then, superInstructions.concat(instructions)), Condition(leftConstantInstruction, rightConstantInstruction, conditionOperator, i.condition.negate))
                    } else {
                        return IfElseInstruction(this.deserializeInstructions(i.then, superInstructions.concat(instructions)), this.deserializeInstructions((i as IfElseInstructionSchema).else, superInstructions.concat(instructions)), Condition(leftConstantInstruction, rightConstantInstruction, conditionOperator, i.condition.negate))
                    }
                }
                case InstructionType.CreateDevicePropertyConstantInstruction:
                case InstructionType.CreateConstantInstruction: {
                    const i = instruction.instruction as unknown as ConstantInstructionSchema
                    return this.deserializeConstantInstruction(i, instruction.type)
                }
            }
        })
    }

    private serializeCondition(condition: Condition<unknown>): ConditionSchema {
        return { leftConstantName: condition.leftConstant.name, rightConstantName: condition.rightConstant.name, conditionOperatorType: this.serializeConditionOperator(condition.operator), negate: condition.negate }
    }

    private serializeConditionOperator(operator: ConditionOperator<unknown>): ConditionOperatorType {
        if (isNumberEOperator(operator)) {
            return ConditionOperatorType.NumberEOperator
        } else if (isNumberGEOperator(operator)) {
            return ConditionOperatorType.NumberGEOperator
        } else if (isNumberGOperator(operator)) {
            return ConditionOperatorType.NumberGOperator
        } else if (isNumberLEOperator(operator)) {
            return ConditionOperatorType.NumberLEOperator
        } else if (isNumberLOperator(operator)) {
            return ConditionOperatorType.NumberLOperator
        } else if (isBooleanEOperator(operator)) {
            return ConditionOperatorType.BooleanEOperator
        } else if (isStringEOperator(operator)) {
            return ConditionOperatorType.StringEOperator
        } else if (isColorEOperator(operator)) {
            return ConditionOperatorType.ColorEOperator
        } else {
            throw new Error("It was not possible to serialize the following operator into a known type of operator:\n" + JSON.stringify(operator))
        }
    }
    private deserializeConditionOperator(type: ConditionOperatorType) {
        switch (type) {
            case ConditionOperatorType.NumberEOperator:
                return NumberEOperator()
            case ConditionOperatorType.NumberGEOperator:
                return NumberGEOperator()
            case ConditionOperatorType.NumberGOperator:
                return NumberGOperator()
            case ConditionOperatorType.NumberLEOperator:
                return NumberLEOperator()
            case ConditionOperatorType.NumberLOperator:
                return NumberLOperator()
            case ConditionOperatorType.BooleanEOperator:
                return BooleanEOperator()
            case ConditionOperatorType.StringEOperator:
                return StringEOperator()
            case ConditionOperatorType.ColorEOperator:
                return ColorEOperator()
        }
    }

    /** Searches constant instructions by name. */
    private findConstantInstructionSchemaByName(instructions: InstructionSchema[], name: string): [ConstantInstructionSchema, InstructionType.CreateConstantInstruction | InstructionType.CreateDevicePropertyConstantInstruction] | undefined {
        const instr = instructions.find(i =>
            (i.type == InstructionType.CreateConstantInstruction || i.type == InstructionType.CreateDevicePropertyConstantInstruction) &&
            (i.instruction as ConstantInstructionSchema).name == name
        )
        if (instr) {
            return [instr.instruction as ConstantInstructionSchema, instr.type as InstructionType.CreateConstantInstruction | InstructionType.CreateDevicePropertyConstantInstruction]
        }
    }

    private deserializeConstantInstruction(instruction: ConstantInstructionSchema, type: InstructionType.CreateConstantInstruction | InstructionType.CreateDevicePropertyConstantInstruction): ConstantInstruction<unknown> {
        switch (type) {
            case InstructionType.CreateConstantInstruction: {
                const i = instruction as CreateConstantInstructionSchema
                return CreateConstantInstruction(i.name, i.type, i.value)
            }
            case InstructionType.CreateDevicePropertyConstantInstruction: {
                const i = instruction as CreateDevicePropertyConstantInstructionSchema
                return CreateDevicePropertyConstantInstruction(i.name, i.type, DeviceId(i.deviceId), DevicePropertyId(i.devicePropertyId))
            }
        }
    }
}
