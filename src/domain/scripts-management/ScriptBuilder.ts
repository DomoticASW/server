import { Effect, succeed, fail } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Condition, ConditionOperator, ConstantInstruction, Instruction } from "./Instruction.js";
import { ConstantRef, ElseNodeRef, NodeRef, RootNodeRef, ThenNodeRef } from "./Refs.js";
import { Automation, AutomationId, ScriptId, Task, TaskId } from "./Script.js";
import { Email } from "../users-management/User.js";
import { Type } from "../../ports/devices-management/Types.js";
import { InvalidScriptError } from "../../ports/scripts-management/Errors.js";
import { DeviceEventTrigger, PeriodTrigger, Trigger } from "./Trigger.js";
import * as uuid from "uuid";
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./InstructionImpl.js";

export interface ScriptBuilder<S = Task | Automation> {
  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef];
  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef, NodeRef];
  addWait(ref: NodeRef, seconds: number): ScriptBuilder<S>;
  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<S>;
  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): ScriptBuilder<S>;
  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<S>;
  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<S>, ConstantRef];
  addCreateDevicePropertyConstant(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef];

  build(): Effect<S, InvalidScriptError>
  buildWithId(id: ScriptId): Effect<S, InvalidScriptError>
}

export type AutomationBuilder = ScriptBuilder<Automation>
export type TaskBuilder = ScriptBuilder<Task>

abstract class ScriptBuilderImpl<S = Task | Automation> implements ScriptBuilder<S> {
  constructor(
    protected name: string,
    protected nodeRefs: Array<[NodeRef, Instruction]>,
    protected errors: Array<InvalidScriptError>
  ) {}

  private createCopy(ref: NodeRef, instruction: Instruction): ScriptBuilderImpl<S> {
    const newBuilder = this.copy(this.nodeRefs, this.errors)

    newBuilder.nodeRefs.push([ref, instruction])
  
    return newBuilder
  }

  private checkIfOnInnerScope(innerScope: NodeRef, outerScope: NodeRef): boolean {
    if (innerScope == outerScope) {
      return true
    } else if (innerScope.__brand == "RootNodeRef") {
      return false
    } else {
      return this.checkIfOnInnerScope(innerScope.superNode, outerScope)
    }
  }

  private addOutsideScopeOfConstantError(constant: ConstantRef) {
    this.errors.push(InvalidScriptError("The constant " + constant.constantInstruction.name + " was not defined inside of the if's scope"))
  }

  private createIfOnBuilder(ref: NodeRef, left: ConstantRef, right: ConstantRef, instruction: Instruction): ScriptBuilder<S> {
    const newBuilder = this.copy(this.nodeRefs, this.errors);

    if (!this.checkIfOnInnerScope(ref, left.scopeNode)) {
      newBuilder.addOutsideScopeOfConstantError(left);
    }

    if (!this.checkIfOnInnerScope(ref, right.scopeNode)) {
      newBuilder.addOutsideScopeOfConstantError(right);
    }

    newBuilder.nodeRefs.push([ref, instruction]);

    return newBuilder;
  }

  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef] {
    const instruction = IfInstruction([], Condition(left.constantInstruction, right.constantInstruction, operator, negate));
    const thenNodeRef = ThenNodeRef(instruction, ref);
    return [ this.createIfOnBuilder(ref, left, right, instruction), thenNodeRef ];
  }

  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef, NodeRef] {
    const instruction = IfElseInstruction([], [], Condition(left.constantInstruction, right.constantInstruction, operator, negate))
    const thenNodeRef = ThenNodeRef(instruction, ref)
    const elseNodeRef = ElseNodeRef(instruction, ref)

    return [ this.createIfOnBuilder(ref, left, right, instruction), thenNodeRef, elseNodeRef ]
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

  private addConstantInstructionToBuilder(ref: NodeRef, instruction: ConstantInstruction<unknown>): [ScriptBuilder<S>, ConstantRef] {
    const constantRef = ConstantRef(instruction, ref)
    return [
      this.createCopy(ref, instruction),
      constantRef
    ]
  }

  addCreateConstant<T>(ref: NodeRef, name: string, type: Type, value: T): [ScriptBuilder<S>, ConstantRef] {
    return this.addConstantInstructionToBuilder(ref, CreateConstantInstruction(name, type, value))
  }

  addCreateDevicePropertyConstant(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef] {
    return this.addConstantInstructionToBuilder(ref, CreateDevicePropertyConstantInstruction(name, type, deviceId, propertyId))
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
        case "ElseNodeRef":
          ref.instruction.else.push(instruction)
          break;
      }
    });
    return instructions;
  }

  abstract build(): Effect<S, InvalidScriptError>
  abstract buildWithId(id: ScriptId): Effect<S, InvalidScriptError, never>
  protected abstract copy(
    nodeRefs: Array<[NodeRef, Instruction]>,
    errors: Array<InvalidScriptError>
  ): ScriptBuilderImpl<S>
}

class TaskBuilderImpl extends ScriptBuilderImpl<Task> {
  build(): Effect<Task, InvalidScriptError> {
    return this.buildWithId(TaskId(uuid.v4()))
  }

  buildWithId(id: TaskId): Effect<Task, InvalidScriptError> {
    const instructions: Array<Instruction> = this.buildInstructions();

    return this.errors.length == 0
      ? succeed(Task(id, this.name, instructions))
      : fail(InvalidScriptError(this.errors.map(err => err.cause).join(", ")));
  }

  protected copy(
    nodeRefs: Array<[NodeRef, Instruction]>,
    errors: Array<InvalidScriptError>
  ): TaskBuilderImpl {
    return new TaskBuilderImpl(this.name, Array.from(nodeRefs), Array.from(errors))
  }
}

class AutomationBuilderImpl extends ScriptBuilderImpl<Automation> {
  constructor(
    name: string,
    private trigger: Trigger,
    nodeRefs: Array<[NodeRef, Instruction]>,
    errors: Array<InvalidScriptError>
  ) {
    super(name, nodeRefs, errors)
  }

  build(): Effect<Automation, InvalidScriptError> {
    return this.buildWithId(AutomationId(uuid.v4()))
  }

  buildWithId(id: AutomationId): Effect<Automation, InvalidScriptError> {
    const instructions: Array<Instruction> = this.buildInstructions();

    return this.errors.length == 0 ? succeed(Automation(id, this.name, this.trigger, instructions)) : fail(InvalidScriptError(this.errors.reduce((err1, err2) => InvalidScriptError(err1.cause + ", " + err2.cause)).cause))
  }

  protected copy(
    nodeRefs: Array<[NodeRef, Instruction]>,
    errors: Array<InvalidScriptError>
  ): AutomationBuilderImpl {
    return new AutomationBuilderImpl(this.name, this.trigger, Array.from(nodeRefs), Array.from(errors))
  }
}

export function TaskBuilder(name: string): [TaskBuilder, NodeRef] {
  return [new TaskBuilderImpl(name, [], []), RootNodeRef()]
}

export function AutomationBuilderWithPeriodtrigger(name: string, start: Date, periodSeconds: number): [AutomationBuilder, NodeRef] {
  return [ new AutomationBuilderImpl(name, PeriodTrigger(start, periodSeconds), [], []), RootNodeRef() ]
}

export function AutomationBuilderWithDeviceEventTrigger(name: string, deviceId: DeviceId, eventName: string): [AutomationBuilder, NodeRef] {
  return [ new AutomationBuilderImpl(name, DeviceEventTrigger(deviceId, eventName), [], []), RootNodeRef() ]
}
