import { Effect } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { ConditionOperator } from "./Instruction.js";
import { ConstantRef, ElseNodeRef, NodeRef, ThenNodeRef } from "./Refs.js";
import { Automation, Task, TaskId } from "./Script.js";
import { Email } from "../users-management/User.js";
import { Type } from "../../ports/devices-management/Types.js";
import { InvalidScriptError } from "../../ports/scripts-management/Errors.js";

interface ScriptBuilder<S = Task | Automation> {
  addIf<T>(ref: NodeRef, left: ConstantRef<T>, right: ConstantRef<T>, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, ThenNodeRef];
  addIfElse<T>(ref: NodeRef, left: ConstantRef<T>, right: ConstantRef<T>, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, ThenNodeRef, ElseNodeRef];
  addWait(ref: string, time: number): ScriptBuilder<S>;
  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<S>;
  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: object): ScriptBuilder<S>;
  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<S>;
  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<S>, ConstantRef<T>];
  addCreateDevicePropertyConstant<T>(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef<T>];

  build(): Effect<S, InvalidScriptError>
}

export type AutomationBuilder = ScriptBuilder<Automation>
export type TaskBuilder = ScriptBuilder<Task>
