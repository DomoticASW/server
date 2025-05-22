import { Effect, succeed } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Condition, ConditionOperator, Instruction } from "./Instruction.js";
import { ConstantRef, NodeRef, RootNodeRef, ThenNodeRef } from "./Refs.js";
import { Automation, Task, TaskId } from "./Script.js";
import { Email } from "../users-management/User.js";
import { Type } from "../../ports/devices-management/Types.js";
import { InvalidScriptError } from "../../ports/scripts-management/Errors.js";
import { Trigger } from "./Trigger.js";
import * as uuid from "uuid";
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./InstructionImpl.js";

interface ScriptBuilder<S = Task | Automation> {
  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef];
  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef, NodeRef];
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
  constructor(
    protected name: string,
    protected nodeRefs: Array<[NodeRef, Instruction]>
  ) {}

  private createCopy(ref: NodeRef, instruction: Instruction): ScriptBuilderImpl<S> {
    const newBuilder = this.copy(this.nodeRefs)

    newBuilder.nodeRefs.push([ref, instruction])
  
    return newBuilder
  }

  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef] {
    const instruction = IfInstruction([], Condition(left.constantInstruction, right.constantInstruction, operator, negate))
    const thenNodeRef = ThenNodeRef(instruction)
    return [
      this.createCopy(ref, instruction),
      thenNodeRef
    ]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef, NodeRef] {
    throw new Error("Method not implemented.");
  }

  addWait(ref: NodeRef, seconds: number): ScriptBuilder<S> {
    return this.createCopy(ref, WaitInstruction(seconds))
  }

  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<S> {
    return this.createCopy(ref, SendNotificationInstruction(email, message))
  }

  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): ScriptBuilder<S> {
    return this.createCopy(ref, DeviceActionInstruction(deviceId, actionId, input))
  }

  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<S> {
    return this.createCopy(ref, StartTaskInstruction(taskId))
  }

  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<S>, ConstantRef] {
    const constantRef = ConstantRef(CreateConstantInstruction(name, type, value), ref)
    return [
      this.createCopy(ref, constantRef.constantInstruction),
      constantRef
    ]
  }

  addCreateDevicePropertyConstant(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef] {
    const constantRef = ConstantRef(CreateDevicePropertyConstantInstruction(name, type, deviceId, propertyId), ref)
    return [
      this.createCopy(ref, constantRef.constantInstruction),
      constantRef
    ]
  }

  protected buildInstructions() {
    const instructions: Array<Instruction> = [];
    this.nodeRefs.forEach(([ref, instruction]) => {
      switch (ref.__brand) {
        case "RootNodeRef":
          instructions.push(instruction);
          break;
        case "ThenNodeRef":
          ref.instruction.then.push(instruction)
          break;
      }
    });
    return instructions;
  }

  abstract build(): Effect<S, InvalidScriptError>
  protected abstract copy(
    nodeRefs: Array<[NodeRef, Instruction]>
  ): ScriptBuilderImpl<S>
}

class TaskBuilderImpl extends ScriptBuilderImpl<Task> {
  build(): Effect<Task, InvalidScriptError> {
    const instructions: Array<Instruction> = this.buildInstructions();
    
    return succeed(Task(TaskId(uuid.v4()), this.name, instructions))
  }

  protected copy(
    nodeRefs: Array<[NodeRef, Instruction]>
  ): TaskBuilderImpl {
    return new TaskBuilderImpl(this.name, Array.from(nodeRefs))
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class AutomationBuilderImpl extends ScriptBuilderImpl<Automation> {
  constructor(
    name: string,
    private trigger: Trigger,
    nodeRefs: Array<[NodeRef, Instruction]>
  ) {
    super(name, nodeRefs)
  }

  build(): Effect<Automation, InvalidScriptError> {
    throw new Error("Method not implemented.");
  }

  protected copy(
    nodeRefs: Array<[NodeRef, Instruction]>
  ): AutomationBuilderImpl {
    return new AutomationBuilderImpl(this.name, this.trigger, Array.from(nodeRefs))
  }
}

export function TaskBuilder(name: string): [TaskBuilder, NodeRef] {
  return [new TaskBuilderImpl(name, []), RootNodeRef()]
}