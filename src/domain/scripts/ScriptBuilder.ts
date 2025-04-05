import { Effect } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { ConditionOperator } from "./Instruction.js";
import { ConstantRef, ElseNodeRef, NodeRef, ThenNodeRef } from "./Refs.js";
import { Automation, Task, TaskId } from "./Script.js";
import { Email } from "../users-management/User.js";
import { Type } from "../../ports/devices-management/Types.js";
import { InvalidScriptError } from "../../ports/scripts/Errors.js";

interface ScriptBuilder<A = Task | Automation> {
  addIf<T>(ref: NodeRef, left: ConstantRef<T>, right: ConstantRef<T>, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<A>, ThenNodeRef];
  addIfElse<T>(ref: NodeRef, left: ConstantRef<T>, right: ConstantRef<T>, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<A>, ThenNodeRef, ElseNodeRef];
  addWait(ref: string, time: number): ScriptBuilder<A>;
  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<A>;
  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: object): ScriptBuilder<A>;
  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<A>;
  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<A>, ConstantRef<T>];
  addCreateDevicePropertyConstant<T>(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<A>, ConstantRef<T>];

  build(): Effect<A, InvalidScriptError>
}

export type AutomationBuilder = ScriptBuilder<Automation>
export type TaskBuilder = ScriptBuilder<Task>
