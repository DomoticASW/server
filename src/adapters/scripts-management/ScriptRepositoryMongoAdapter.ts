import mongoose, { Document, Model, Schema } from "mongoose";
import { Automation, AutomationId, Script, ScriptId, Task, TaskId } from "../../domain/scripts-management/Script.js";
import { BaseRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapter.js";
import { DeviceEventTrigger, PeriodTrigger } from "../../domain/scripts-management/Trigger.js";
import { DeviceId } from "../../domain/devices-management/Device.js";
import { Instruction } from "../../domain/scripts-management/Instruction.js";

enum ScriptType {
    Task = "Task",
    Automation = "Automation"
}

interface ScriptSchema {
    _id: string
    name: string

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

export class ScriptRepositoryMongoAdapter extends BaseRepositoryMongoAdapter<ScriptId, Script<ScriptId>, string, ScriptSchema> {
    private triggerSchema = new mongoose.Schema<TriggerSchema>({
        triggerType: { type: String, enum: TriggerType, required: true },
        trigger: { type: Schema.Types.Mixed, required: true }
    });
    private automationDataSchema = new mongoose.Schema<AutomationDataSchema>({
        enabled: { type: Boolean, required: true },
        trigger: { type: this.triggerSchema, required: true }
    });
    private scriptSchema = new mongoose.Schema<ScriptSchema>({
        _id: { type: String, required: true },
        name: { type: String, required: true },
        scriptType: { type: String, enum: ScriptType, required: true },
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
        // TODO: serialize instructions
        return new this.Script({ _id: e.id, name: e.name, scriptType: scriptType, automationData: automationData })
    }

    protected toEntity(s: ScriptSchema): Script<ScriptId> {
        let trigger: PeriodTrigger | DeviceEventTrigger
        const instructions: Instruction[] = [] // TODO: deserialize instructions
        switch (s.scriptType) {
            case ScriptType.Automation:
                if (s.automationData!.trigger.triggerType == TriggerType.Period) {
                    const t = s.automationData!.trigger.trigger as PeriodTriggerSchema
                    trigger = PeriodTrigger(t.start, t.periodSeconds)
                } else {
                    const t = s.automationData!.trigger.trigger as DeviceEventTriggerSchema
                    trigger = DeviceEventTrigger(DeviceId(t.deviceId), t.eventName)
                }
                return Automation(AutomationId(s._id), s.name, trigger, instructions)
            case ScriptType.Task:
                return Task(TaskId(s._id), s.name, instructions)
        }
    }

    protected model(): Model<ScriptSchema> {
        return this.Script
    }
}
