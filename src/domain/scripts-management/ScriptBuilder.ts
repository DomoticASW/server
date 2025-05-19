/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, succeed } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { ConditionOperator, Instruction } from "./Instruction.js";
import { ConstantRef, ElseNodeRef, NodeRef, RootNodeRef, ThenNodeRef } from "./Refs.js";
import { Automation, Script, ScriptId, Task, TaskId } from "./Script.js";
import { Email } from "../users-management/User.js";
import { Type } from "../../ports/devices-management/Types.js";
import { InvalidScriptError } from "../../ports/scripts-management/Errors.js";
import { Trigger } from "./Trigger.js";
import * as uuid from "uuid";
import { DeviceActionInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./InstructionImpl.js";

interface ScriptBuilder<S = Task | Automation> {
  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, ThenNodeRef];
  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, ThenNodeRef, ElseNodeRef];
  addWait(ref: NodeRef, seconds: number): ScriptBuilder<S>;
  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<S>;
  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): ScriptBuilder<S>;
  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<S>;
  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<S>, ConstantRef];
  addCreateDevicePropertyConstant(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef];

  build(): Effect<S, InvalidScriptError>
}

export type AutomationBuilder = ScriptBuilder<Automation>
export type TaskBuilder = ScriptBuilder<Task>

abstract class ScriptBuilderImpl<S = Task | Automation> implements ScriptBuilder<S> {
  protected instructions: Array<Instruction> = []

  constructor(protected name: string) {}

  private createCopy(instruction: Instruction): ScriptBuilderImpl<S> {
    const newBuilder = this.copy()
    newBuilder.instructions.push(instruction)
    return newBuilder
  }

  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, ThenNodeRef] {
    throw new Error("Method not implemented.");
  }
  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, ThenNodeRef, ElseNodeRef] {
    throw new Error("Method not implemented.");
  }
  addWait(ref: NodeRef, seconds: number): ScriptBuilder<S> {
    return this.createCopy(WaitInstruction(seconds))
  }
  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<S> {
    return this.createCopy(SendNotificationInstruction(email, message))
  }
  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): ScriptBuilder<S> {
    return this.createCopy(DeviceActionInstruction(deviceId, actionId, input))
  }
  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<S> {
    return this.createCopy(StartTaskInstruction(taskId))
  }
  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<S>, ConstantRef] {
    throw new Error("Method not implemented.");
  }
  addCreateDevicePropertyConstant(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef] {
    throw new Error("Method not implemented.");
  }
  abstract build(): Effect<S, InvalidScriptError>
  protected abstract copy(): ScriptBuilderImpl<S>
}

class TaskBuilderImpl extends ScriptBuilderImpl<Task> {
  build(): Effect<Task, InvalidScriptError> {
    return succeed(Task(TaskId(uuid.v4()), this.name, this.instructions))
  }

  protected copy(): TaskBuilderImpl {
    return new TaskBuilderImpl(this.name)
  }
}

class AutomationBuilderImpl extends ScriptBuilderImpl<Automation> {
  constructor(name: string, private trigger: Trigger) {
    super(name)
  }

  build(): Effect<Automation, InvalidScriptError> {
    throw new Error("Method not implemented.");
  }

  protected copy(): AutomationBuilderImpl {
    return new AutomationBuilderImpl(this.name, this.trigger)
  }
}

export function TaskBuilder(name: string): [TaskBuilder, RootNodeRef] {
  return [new TaskBuilderImpl(name), RootNodeRef("root")]
}