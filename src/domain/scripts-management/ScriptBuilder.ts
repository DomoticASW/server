import { Effect, succeed, fail } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Condition, ConditionOperator, ConstantInstruction, Instruction, isIfElseInstruction, isIfInstruction, isStartTaskInstruction } from "./Instruction.js";
import { ConstantRef, ElseNodeRef, NodeRef, RootNodeRef, ThenNodeRef } from "./Refs.js";
import { Automation, AutomationId, ScriptId, Task, TaskId } from "./Script.js";
import { Email } from "../users-management/User.js";
import { Type } from "../../ports/devices-management/Types.js";
import { InvalidScriptError } from "../../ports/scripts-management/Errors.js";
import { DeviceEventTrigger, PeriodTrigger, Trigger } from "./Trigger.js";
import * as uuid from "uuid";
import { CreateConstantInstruction, CreateDevicePropertyConstantInstruction, DeviceActionInstruction, IfElseInstruction, IfInstruction, SendNotificationInstruction, StartTaskInstruction, WaitInstruction } from "./InstructionImpl.js";
import { isBooleanEOperator, isColorEOperator, isNumberEOperator, isNumberGEOperator, isNumberGOperator, isNumberLEOperator, isNumberLOperator, isStringEOperator } from "./Operators.js";

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
  ) { }

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

  private checkTypingOfCondition<T>(condition: Condition<T>) {
    if (condition.leftConstant.type !== condition.rightConstant.type) {
      this.errors.push(InvalidScriptError("The type of the two constants in the if must be the same"))
    }

    if (condition.leftConstant.type === Type.VoidType || condition.rightConstant.type === Type.VoidType) {
      this.errors.push(InvalidScriptError("Constants cannot be of void type"))
    }

    if (isStringEOperator(condition.operator) && condition.leftConstant.type !== Type.StringType) {
      this.errors.push(InvalidScriptError("The string equal operator must be used with strings"))
    } else {
      if (isColorEOperator(condition.operator) && condition.leftConstant.type !== Type.ColorType) {
        this.errors.push(InvalidScriptError("The color equal operator must be used with colors"))
      } else {
        if (isBooleanEOperator(condition.operator) && condition.leftConstant.type !== Type.BooleanType) {
          this.errors.push(InvalidScriptError("The boolean equal operator must be used with booleans"))
        } else {
          if (condition.leftConstant.type !== Type.DoubleType && condition.leftConstant.type !== Type.IntType) {
            const operator = isNumberEOperator(condition.operator) ? "equal" : isNumberGEOperator(condition.operator) ? "greater equal" : isNumberGOperator(condition.operator) ? "greater" : isNumberLEOperator(condition.operator) ? "less equal" : isNumberLOperator(condition.operator) ? "less" : undefined
            if (operator) {
              this.errors.push(InvalidScriptError("The number " + operator + " operator must be used with numbers"))
            }
          }
        }
      }
    }

  }

  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef] {
    const condition = Condition(left.constantInstruction, right.constantInstruction, operator, negate)
    this.checkTypingOfCondition(condition)
    const instruction = IfInstruction([], condition);
    const thenNodeRef = ThenNodeRef(instruction, ref);
    return [this.createIfOnBuilder(ref, left, right, instruction), thenNodeRef];
  }

  addIfElse<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef, NodeRef] {
    const condition = Condition(left.constantInstruction, right.constantInstruction, operator, negate)
    this.checkTypingOfCondition(condition)
    const instruction = IfElseInstruction([], [], condition)
    const thenNodeRef = ThenNodeRef(instruction, ref)
    const elseNodeRef = ElseNodeRef(instruction, ref)

    return [this.createIfOnBuilder(ref, left, right, instruction), thenNodeRef, elseNodeRef]
  }

  addWait(ref: NodeRef, seconds: number): ScriptBuilder<S> {
    if (seconds < 0) {
      this.errors.push(InvalidScriptError("The wait instruction needs positive numbers"))
    }
    return this.createCopy(ref, WaitInstruction(seconds))
  }

  addSendNotification(ref: NodeRef, email: Email, message: string): ScriptBuilder<S> {
    if (email.length === 0) {
      this.errors.push(InvalidScriptError("The email to which send the notification cannot be empty"))
    }
    return this.createCopy(ref, SendNotificationInstruction(email, message))
  }

  addDeviceAction(ref: NodeRef, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): ScriptBuilder<S> {
    return this.createCopy(ref, DeviceActionInstruction(deviceId, actionId, input))
  }

  addStartTask(ref: NodeRef, taskId: TaskId): ScriptBuilder<S> {
    if (taskId.length === 0) {
      this.errors.push(InvalidScriptError("The start task instruction needs the name of a task"))
    }
    return this.createCopy(ref, StartTaskInstruction(taskId))
  }

  private addConstantInstructionToBuilder(ref: NodeRef, instruction: ConstantInstruction<unknown>): [ScriptBuilder<S>, ConstantRef] {
    if (instruction.name.length === 0) {
      this.errors.push(InvalidScriptError("Constants cannot have empty name"))
    }
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
    if (this.name.length === 0) {
      this.errors.push(InvalidScriptError("The name of the task cannot be empty"))
    }
    return this.buildWithId(TaskId(uuid.v4()))
  }

  private checkStartTaskRecursion(instructions: Instruction[], taskId: TaskId) {
    instructions.forEach(instruction => {
      if (isIfInstruction(instruction)) {
        this.checkStartTaskRecursion(instruction.then, taskId)
      }
      if (isIfElseInstruction(instruction)) {
        this.checkStartTaskRecursion(instruction.else, taskId)
      }
      if (isStartTaskInstruction(instruction) && instruction.taskId === taskId) {
        this.errors.push(InvalidScriptError("Cannot refer to the same task from a start task instruction"))
      }
    })
  }

  buildWithId(id: TaskId): Effect<Task, InvalidScriptError> {
    const instructions: Array<Instruction> = this.buildInstructions();

    this.checkStartTaskRecursion(instructions, id)

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
    if (this.name.length === 0) {
      this.errors.push(InvalidScriptError("The name of the automation cannot be empty"))
    }
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
  return [new AutomationBuilderImpl(name, PeriodTrigger(start, periodSeconds), [], []), RootNodeRef()]
}

export function AutomationBuilderWithDeviceEventTrigger(name: string, deviceId: DeviceId, eventName: string): [AutomationBuilder, NodeRef] {
  return [new AutomationBuilderImpl(name, DeviceEventTrigger(deviceId, eventName), [], []), RootNodeRef()]
}
