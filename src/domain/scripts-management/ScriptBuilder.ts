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
    const thenNodeRef = ThenNodeRef(ref.scopeLevel + 1, ref, Condition(left.constantInstruction, right.constantInstruction, operator, negate))
    return [
      this.copy(this.nodeRefs),
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
    const nestedInstructions: Map<NodeRef, Array<Instruction>> = new Map();
    let actualNode: ThenNodeRef;
    let previousNode: ThenNodeRef;
    let i: number = 0;

    this.nodeRefs.forEach(([ref, instruction]) => {
      previousNode = actualNode;
      i++;
      switch (ref.__brand) {
        case "RootNodeRef":
          if (previousNode) {
            this.addOuterIfToInstructions(instructions, nestedInstructions, previousNode);
          }
          instructions.push(instruction);
          break;
        case "ThenNodeRef":
          actualNode = ref;

          if (previousNode && actualNode == previousNode.superNode) {
            // If I'm the super node of the previous instruction I can create the If that comes before me
            this.createIfsUntilStartingNodeIsReached(nestedInstructions, previousNode, actualNode.scopeLevel);
          }
          this.updateNestedInstructions(nestedInstructions, actualNode, instruction);

          if (this.nodeRefs.length == i) {
            //If I'm the last instruction of the script than I add myself to the If instructions and then can create the If on my superNode, then create all the Ifs that I am inside, if there are some
            this.createIfAsLastInstruction(actualNode, actualNode.superNode, nestedInstructions, instructions);
          }

          break;
      }
    });
    return instructions;
  }

  private addOuterIfToInstructions(
    instructions: Instruction[], 
    nestedInstructions: Map<NodeRef, Instruction[]>, 
    previousNode: ThenNodeRef
  ) {
    // Get the node of the last If inside the root, create that if and add it to the instructions
    const lastNode = this.createIfsUntilStartingNodeIsReached(nestedInstructions, previousNode)
    instructions.push(IfInstruction(nestedInstructions.get(lastNode)!, lastNode.condition));
  }

  private createIfsUntilStartingNodeIsReached(
    nestedInstructions: Map<NodeRef, Instruction[]>, 
    previousNode: ThenNodeRef, 
    scopeLevel: number = 0
  ): ThenNodeRef {
    //Add the If of the previousNode to add it to the nestedInstructions of its superNode, until the starting node has been reached
    const superNode = previousNode.superNode
    this.updateNestedInstructions(nestedInstructions, superNode, IfInstruction(nestedInstructions.get(previousNode)!, previousNode.condition))
    if (superNode.scopeLevel != scopeLevel && superNode.__brand == "ThenNodeRef") {
      return this.createIfsUntilStartingNodeIsReached(nestedInstructions, superNode, scopeLevel)
    }

    return previousNode
  }

  private updateNestedInstructions(
    nestedInstructions: Map<NodeRef, Instruction[]>, 
    actualNode: NodeRef, 
    instruction: Instruction
  ) {
    let tempInstructions = nestedInstructions.get(actualNode);

    if (tempInstructions) {
      tempInstructions.push(instruction);
    } else {
      tempInstructions = [instruction];
    }
    nestedInstructions.set(actualNode, tempInstructions);
  }

  private createIfAsLastInstruction(
    actualNode: ThenNodeRef,
    superNode: NodeRef,
    nestedInstructions: Map<NodeRef, Instruction[]>,
    instructions: Array<Instruction>
  ) {
    if (superNode.__brand == "ThenNodeRef") {
      this.updateNestedInstructions(nestedInstructions, superNode, IfInstruction(nestedInstructions.get(actualNode)!, actualNode.condition));
      this.createIfAsLastInstruction(superNode, superNode.superNode, nestedInstructions, instructions)
    } else {
      this.addOuterIfToInstructions(instructions, nestedInstructions, actualNode)
    }
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