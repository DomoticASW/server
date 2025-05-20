import { Effect, succeed } from "effect/Effect";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../devices-management/Device.js";
import { Condition, ConditionOperator, ConstantInstruction, Instruction } from "./Instruction.js";
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
    protected nodeRefs: Array<[NodeRef, Instruction]>,
    protected constantRefs: Map<ConstantRef, ConstantInstruction<unknown>>,
    protected ifRefs: Map<ThenNodeRef, [NodeRef, Condition<unknown>]>
  ) {}

  private addIfNode<T>(ref: NodeRef, thenNodeRef: ThenNodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): ScriptBuilder<S> {
    const newBuilder = this.copy(this.nodeRefs, this.constantRefs, this.ifRefs)

    newBuilder.ifRefs.set(thenNodeRef, [ref, Condition(this.constantRefs.get(left)!, this.constantRefs.get(right)!, operator, negate)])

    return newBuilder
  }

  private createCopy(ref: NodeRef, instruction: Instruction): ScriptBuilderImpl<S> {
    const newBuilder = this.copy(this.nodeRefs, this.constantRefs, this.ifRefs)

    newBuilder.nodeRefs.push([ref, instruction])
  
    return newBuilder
  }

  private createCopyWithConstant(ref: NodeRef, constRef: ConstantRef, instruction: ConstantInstruction<unknown>): ScriptBuilderImpl<S> {
    const newBuilder = this.createCopy(ref, instruction)

    newBuilder.constantRefs.set(constRef, instruction)

    return newBuilder
  }

  addIf<T>(ref: NodeRef, left: ConstantRef, right: ConstantRef, operator: ConditionOperator<T>, negate: boolean): [ScriptBuilder<S>, NodeRef] {
    const thenNodeRef = ThenNodeRef()
    return [
      this.addIfNode(ref, thenNodeRef, left, right, operator, negate),
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
    const constantRef = ConstantRef(name, type)
    return [
      this.createCopyWithConstant(ref, constantRef, CreateConstantInstruction(name, type, value)),
      constantRef
    ]
  }

  addCreateDevicePropertyConstant(ref: NodeRef, name: string, type: Type, deviceId: DeviceId, propertyId: DevicePropertyId): [ScriptBuilder<S>, ConstantRef] {
    const constantRef = ConstantRef(name, type)
    return [
      this.createCopyWithConstant(ref, constantRef, CreateDevicePropertyConstantInstruction(name, type, deviceId, propertyId)),
      constantRef
    ]
  }

  protected buildInstructions() {
    const instructions: Array<Instruction> = [];
    const nestedInstructions: Map<NodeRef, Array<Instruction>> = new Map();
    let actualNode: ThenNodeRef;
    let previousNode: ThenNodeRef;
    let superNode: NodeRef;
    let rootNode: NodeRef;
    let i: number = 0;

    this.nodeRefs.forEach(([ref, instruction]) => {
      previousNode = actualNode;
      i++;
      switch (ref.__brand) {
        case "RootNodeRef":
          superNode = ref;
          rootNode = ref;
          if (previousNode) {
            this.addOuterIfToInstructions(instructions, nestedInstructions, previousNode, ref);
          }
          instructions.push(instruction);
          break;
        case "ThenNodeRef":
          actualNode = ref;

          if (previousNode) {
            superNode = this.ifRefs.get(previousNode)![0];
          }

          if (actualNode == superNode) {
            // If I'm the super node of the previous instruction I can create the If that comes before me
            this.createIfsUntilStartingNodeIsReached(nestedInstructions, previousNode, actualNode);
          }
          this.updateNestedInstructions(nestedInstructions, actualNode, instruction);

          if (this.nodeRefs.length == i) {
            //If I'm the last instruction of the script than I add myself to the If instructions and then can create the If on my superNode, then create all the Ifs that I am inside, if there are some
            this.createIfAsLastInstruction(actualNode, superNode, nestedInstructions, instructions, rootNode);
          }

          break;
      }
    });
    return instructions;
  }

  private addOuterIfToInstructions(
    instructions: Instruction[], 
    nestedInstructions: Map<NodeRef, Instruction[]>, 
    previousNode: ThenNodeRef,
    root: NodeRef
  ) {
    // Get the node of the last If inside the root, create that if and add it to the instructions
    const lastNode = this.createIfsUntilStartingNodeIsReached(nestedInstructions, previousNode, root)
    instructions.push(IfInstruction(nestedInstructions.get(lastNode)!, this.ifRefs.get(lastNode)![1]));
  }

  private createIfsUntilStartingNodeIsReached(
    nestedInstructions: Map<NodeRef, Instruction[]>, 
    previousNode: ThenNodeRef, 
    startingNode: NodeRef
  ): ThenNodeRef {
    //Add the If of the previousNode to add it to the nestedInstructions of its superNode, until the starting node has not been reached
    const superNode = this.ifRefs.get(previousNode)![0]
    this.updateNestedInstructions(nestedInstructions, superNode, IfInstruction(nestedInstructions.get(previousNode)!, this.ifRefs.get(previousNode)![1]))
    if (superNode != startingNode && superNode.__brand == "ThenNodeRef") {
      return this.createIfsUntilStartingNodeIsReached(nestedInstructions, superNode, startingNode)
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
    instructions: Array<Instruction>,
    startingNode: NodeRef
  ) {
    if (superNode.__brand == "ThenNodeRef") {
      this.updateNestedInstructions(nestedInstructions, superNode, IfInstruction(nestedInstructions.get(actualNode)!, this.ifRefs.get(actualNode)![1]));
      this.createIfAsLastInstruction(superNode, this.ifRefs.get(superNode)![0], nestedInstructions, instructions, startingNode)
    } else {
      this.addOuterIfToInstructions(instructions, nestedInstructions, actualNode, startingNode)
    }
  }

  abstract build(): Effect<S, InvalidScriptError>
  protected abstract copy(
    nodeRefs: Array<[NodeRef, Instruction]>, 
    constantRefs: Map<ConstantRef, ConstantInstruction<unknown>>,
    ifRefs: Map<NodeRef, [NodeRef, Condition<unknown>]>
  ): ScriptBuilderImpl<S>
}

class TaskBuilderImpl extends ScriptBuilderImpl<Task> {
  build(): Effect<Task, InvalidScriptError> {
    const instructions: Array<Instruction> = this.buildInstructions();
    
    return succeed(Task(TaskId(uuid.v4()), this.name, instructions))
  }

  protected copy(
    nodeRefs: Array<[NodeRef, Instruction]>,
    constantRefs: Map<ConstantRef, ConstantInstruction<unknown>>,
    ifRefs: Map<ThenNodeRef, [NodeRef, Condition<unknown>]>
  ): TaskBuilderImpl {
    return new TaskBuilderImpl(this.name, Array.from(nodeRefs), new Map(constantRefs), new Map(ifRefs))
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class AutomationBuilderImpl extends ScriptBuilderImpl<Automation> {
  constructor(
    name: string, 
    private trigger: Trigger,
    nodeRefs: Array<[NodeRef, Instruction]>,
    constantRefs: Map<ConstantRef, ConstantInstruction<unknown>>,
    ifRefs: Map<ThenNodeRef, [NodeRef, Condition<unknown>]>
  ) {
    super(name, nodeRefs, constantRefs, ifRefs)
  }

  build(): Effect<Automation, InvalidScriptError> {
    throw new Error("Method not implemented.");
  }

  protected copy(
    nodeRefs: Array<[NodeRef, Instruction]>,
    constantRefs: Map<ConstantRef, ConstantInstruction<unknown>>,
    ifRefs: Map<ThenNodeRef, [NodeRef, Condition<unknown>]>
  ): AutomationBuilderImpl {
    return new AutomationBuilderImpl(this.name, this.trigger, Array.from(nodeRefs), new Map(constantRefs), new Map(ifRefs))
  }
}

export function TaskBuilder(name: string): [TaskBuilder, NodeRef] {
  return [new TaskBuilderImpl(name, [], new Map(), new Map()), RootNodeRef()]
}