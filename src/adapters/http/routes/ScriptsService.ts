import express from "express";
import { ScriptsService } from "../../../ports/scripts-management/ScriptsService.js";
import { UsersService } from "../../../ports/users-management/UserService.js";
import { Effect } from "effect";
import { BadRequest, deserializeToken, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { TaskBuilder } from "../../../domain/scripts-management/ScriptBuilder.js";
import { StatusCodes } from "http-status-codes";
import { ConstantRef, NodeRef } from "../../../domain/scripts-management/Refs.js";
import { Email } from "../../../domain/users-management/User.js";
import { TaskId } from "../../../domain/scripts-management/Script.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../domain/devices-management/Device.js";
import { Type } from "../../../ports/devices-management/Types.js";
import { ConditionOperator } from "../../../domain/scripts-management/Instruction.js";
import { NumberEOperator, NumberGEOperator, NumberGOperator, NumberLEOperator, NumberLOperator, BooleanEOperator, StringEOperator, ColorEOperator } from "../../../domain/scripts-management/Operators.js";
import { InvalidScriptError } from "../../../ports/scripts-management/Errors.js";
import { Request } from "express-serve-static-core";
import { ParsedQs } from "qs";

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
  thenId: string,
  condition: ConditionSchema
}

interface IfElseInstructionSchema extends IfInstructionSchema {
  elseId: string
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

enum NodeRefType {
  RootNodeRef = "RootNodeRef",
  BranchNodeRef = "BranchNodeRef"
}

interface NodeRefSchema {
  type: NodeRefType
}

interface BranchNodeRefSchema extends NodeRefSchema {
  id: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSendNotificationInstruction(o: any): o is SendNotificationInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'email' in o && typeof o.email === 'string' &&
    'message' in o && typeof o.message === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isWaitInstruction(o: any): o is WaitInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'seconds' in o && typeof o.seconds === 'number'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isStartTaskInstruction(o: any): o is StartTaskInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'taskId' in o && typeof o.taskId === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDeviceActionInstruction(o: any): o is DeviceActionInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'deviceId' in o && typeof o.deviceId === 'string' &&
    'deviceActionId' in o && typeof o.deviceActionId === 'string' &&
    'input' in o
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCreateConstantInstruction(o: any): o is CreateConstantInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'name' in o && typeof o.name === 'string' &&
    'type' in o && typeof o.type === 'string' &&
    'value' in o
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCreateDevicePropertyConstantInstruction(o: any): o is CreateDevicePropertyConstantInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'name' in o && typeof o.name === 'string' &&
    'type' in o && typeof o.type === 'string' &&
    'deviceId' in o && typeof o.deviceId === 'string' &&
    'devicePropertyId' in o && typeof o.devicePropertyId === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIfInstruction(o: any): o is IfInstructionSchema {
  return o &&
    typeof o === 'object' &&
    'thenId' in o && typeof o.thenId === 'string' &&
    'condition' in o && isCondition(o.condition)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIfElseInstruction(o: any): o is IfElseInstructionSchema {
  return isIfInstruction(o) &&
    'elseId' in o && typeof o.elseId === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCondition(o: any): o is ConditionSchema {
  return o &&
    typeof o === 'object' &&
    'leftConstantName' in o && typeof o.leftConstantName === 'string' &&
    'rightConstantName' in o && typeof o.rightConstantName === 'string' &&
    'negate' in o && typeof o.negate === 'boolean' &&
    'conditionOperatorType' in o && typeof o.conditionOperatorType === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInstruction(instruction: any): instruction is InstructionSchema {
  return instruction
    && typeof instruction === 'object'
    && 'type' in instruction
    && typeof instruction.type === 'string'
    && "instruction" in instruction && (isSendNotificationInstruction(instruction.instruction)
      || isWaitInstruction(instruction.instruction)
      || isStartTaskInstruction(instruction.instruction)
      || isDeviceActionInstruction(instruction.instruction)
      || isIfInstruction(instruction.instruction)
      || isIfElseInstruction(instruction.instruction)
      || isCreateConstantInstruction(instruction.instruction)
      || isCreateDevicePropertyConstantInstruction(instruction.instruction)) 
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNodeRef(nodeRef: any): nodeRef is NodeRefSchema {
  return nodeRef &&
    typeof nodeRef === 'object' &&
    'type' in nodeRef && typeof nodeRef.type === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBranchNodeRef(nodeRef: any): nodeRef is BranchNodeRefSchema {
  return isNodeRef(nodeRef) &&
    'id' in nodeRef && typeof nodeRef.id === 'string'
}

function deserializeConditionOperator(type: ConditionOperatorType): ConditionOperator<unknown> {
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

export function registerScriptsServiceRoutes(app: express.Express, service: ScriptsService, usersService: UsersService) {
  //create
  app.post('/api/tasks', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("completeBuilder", () => completeBuilder(req)),
      Effect.bind('taskId', ({token, completeBuilder}) => service.createTask(token, completeBuilder)),
      Effect.map(({taskId}) => Response(StatusCodes.CREATED, { id: taskId})),
      Effect.catch("__brand", {
        failure: "InvalidScriptError",
        onFailure: (error) => Effect.succeed(Response(StatusCodes.BAD_REQUEST, error))
      }),
      Effect.catch("__brand", {
        failure: "TaskNameAlreadyInUse",
        onFailure: error => Effect.succeed(Response(StatusCodes.CONFLICT, error))
      }),
      handleCommonErrors,
      Effect.runPromise
    )

    sendResponse(res, response)
  })

  // execute task
  app.post('/api/tasks/:id/execute', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("task", ({ token }) => service.startTask(token, TaskId(req.params.id))),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: err => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  })

  // edit task
  app.patch('/api/tasks/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("completeBuilder", () => completeBuilder(req)),
      Effect.bind("_", ({ token, completeBuilder }) => service.editTask(token, TaskId(req.params.id), completeBuilder)),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      Effect.catch("__brand", {
        failure: "InvalidScriptError",
        onFailure: (error) => Effect.succeed(Response(StatusCodes.BAD_REQUEST, error))
      }),
      Effect.catch("__brand", {
        failure: "TaskNameAlreadyInUse",
        onFailure: error => Effect.succeed(Response(StatusCodes.CONFLICT, error))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // delete task
  app.delete('/api/tasks/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("_", ({ token }) => service.removeTask(token, TaskId(req.params.id))),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // get one task
  app.get('/api/tasks/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("task", ({ token }) => service.findTask(token, TaskId(req.params.id))),
      Effect.map(({ task }) => Response(StatusCodes.OK, task)),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // get all tasks
  app.get('/api/tasks', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("tasks", ({ token }) => service.getAllTasks(token)),
      Effect.map(({ tasks }) => Response(StatusCodes.CREATED, Array.from(tasks))),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function completeBuilder(req: Request<object, any, any, ParsedQs, Record<string, any>>): Effect.Effect<TaskBuilder, BadRequest | InvalidScriptError> {
  return Effect.Do.pipe(
    Effect.bind("taskNameVal", () => Effect.if(req.body != undefined && "name" in req.body, {
      onTrue: () => Effect.succeed(req.body.name),
      onFalse: () => Effect.fail(BadRequest("Missing task name property in request body"))
    })),
    Effect.bind("taskName", ({ taskNameVal }) => {
      if (typeof taskNameVal == "string") { return Effect.succeed(taskNameVal) }
      else { return Effect.fail(BadRequest(`Expected task name of type string but found ${typeof taskNameVal}`)) }
    }),
    Effect.bind("builderAndRef", ({ taskName }) => Effect.succeed(TaskBuilder(taskName))),
    Effect.bind("instructionsAndRefsVal", () => Effect.if("instructions" in req.body, {
      onTrue: () => Effect.succeed(req.body.instructions),
      onFalse: () => Effect.succeed([])
    })),
    Effect.bind("instructionsSchemas", ({ instructionsAndRefsVal }) => createInstructionsSchemas(instructionsAndRefsVal)),
    Effect.flatMap(({ instructionsSchemas, builderAndRef }) => createBuilderWithInstructions(builderAndRef, instructionsSchemas))
  )
}

function createBuilderWithInstructions(builderAndRef: [TaskBuilder, NodeRef], instructionsSchemas: Array<[InstructionSchema, NodeRefSchema]>) {
  let taskBuilderAndErr: [TaskBuilder, InvalidScriptError | undefined] = [builderAndRef[0], undefined]
  const root = builderAndRef[1]
  const branchRefs: Map<string, NodeRef> = new Map()
  const constRefs: Array<ConstantRef> = []

  for (const schema of instructionsSchemas) {
    const instructionSchema = schema[0]
    const nodeRefSchema = schema[1]
    if (isBranchNodeRef(nodeRefSchema) && !branchRefs.get(nodeRefSchema.id)) {
      return Effect.fail(InvalidScriptError("The node with the id " + nodeRefSchema.id + " does not exists in the task"))
    }
    const nodeRef: NodeRef = isBranchNodeRef(nodeRefSchema) ? branchRefs.get(nodeRefSchema.id)! : root

    taskBuilderAndErr = createBuilderFromInstructionAndRef(taskBuilderAndErr[0]!, instructionSchema, nodeRef, constRefs, branchRefs);
    if (taskBuilderAndErr[1]) {
      return Effect.fail(taskBuilderAndErr[1])
    }
  }
  return Effect.succeed(taskBuilderAndErr[0])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createInstructionsSchemas(instructionsAndRefsVal: any) {
  const instructions: Array<[InstructionSchema, NodeRefSchema]> = []
  if (Array.isArray(instructionsAndRefsVal)) {
    for (const instructionAndRef of instructionsAndRefsVal) {
      if (!pushInstructionAndRef(instructionAndRef, instructions)) {
        return Effect.fail(BadRequest("One or more instructions have invalid shape"))
      }
    }
  } else {
    return Effect.fail(BadRequest("The instructions must be an array"))
  }
  return Effect.succeed(instructions)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pushInstructionAndRef(instructionAndRef: any, instructions: [InstructionSchema, NodeRefSchema][]) {
  if (isInstruction(instructionAndRef[0]) && (isNodeRef(instructionAndRef[1]) || isBranchNodeRef(instructionAndRef[1]))) {
    instructions.push(instructionAndRef);
    return true
  }

  return false
}

function createBuilderFromInstructionAndRef(taskBuilder: TaskBuilder, instructionSchema: InstructionSchema, nodeRef: NodeRef, constRefs: ConstantRef[], branchRefs: Map<string, NodeRef>): [TaskBuilder, InvalidScriptError | undefined] {
  let err: InvalidScriptError | undefined
  switch (instructionSchema.type) {
    case InstructionType.SendNotificationInstruction: {
      const instruction = instructionSchema.instruction as unknown as SendNotificationInstructionSchema;
      taskBuilder = taskBuilder.addSendNotification(nodeRef, Email(instruction.email), instruction.message);
      break;
    }
    case InstructionType.WaitInstruction: {
      const instruction = instructionSchema.instruction as unknown as WaitInstructionSchema;
      taskBuilder = taskBuilder.addWait(nodeRef, instruction.seconds);
      break;
    }
    case InstructionType.StartTaskInstruction: {
      const instruction = instructionSchema.instruction as unknown as StartTaskInstructionSchema;
      taskBuilder = taskBuilder.addStartTask(nodeRef, TaskId(instruction.taskId));
      break;
    }
    case InstructionType.DeviceActionInstruction: {
      const instruction = instructionSchema.instruction as unknown as DeviceActionInstructionSchema;
      taskBuilder = taskBuilder.addDeviceAction(nodeRef, DeviceId(instruction.deviceId), DeviceActionId(instruction.deviceActionId), instruction.input);
      break;
    }
    case InstructionType.CreateConstantInstruction: {
      const instruction = instructionSchema.instruction as unknown as CreateConstantInstructionSchema;
      const builderAndRef = taskBuilder.addCreateConstant(nodeRef, instruction.name, instruction.type, instruction.value);
      taskBuilder = builderAndRef[0];
      constRefs.push(builderAndRef[1]);
      break;
    }
    case InstructionType.CreateDevicePropertyConstantInstruction: {
      const instruction = instructionSchema.instruction as unknown as CreateDevicePropertyConstantInstructionSchema;
      const builderAndRef = taskBuilder.addCreateDevicePropertyConstant(nodeRef, instruction.name, instruction.type, DeviceId(instruction.deviceId), DevicePropertyId(instruction.devicePropertyId));
      taskBuilder = builderAndRef[0];
      constRefs.push(builderAndRef[1]);
      break;
    }
    case InstructionType.IfInstruction: {
      const ifInstructionSchema = instructionSchema.instruction as unknown as IfInstructionSchema;
      const left = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.leftConstantName);
      const right = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.rightConstantName);
      if (!left || !right) {
        return [taskBuilder, InvalidScriptError("One or two of the two constants " + ifInstructionSchema.condition.leftConstantName + " and " + ifInstructionSchema.condition.rightConstantName + " are not declared before the If" )]
      }
      const builderAndRef = taskBuilder.addIf(nodeRef, left, right, deserializeConditionOperator(ifInstructionSchema.condition.conditionOperatorType), ifInstructionSchema.condition.negate);
      taskBuilder = builderAndRef[0];
      branchRefs.set(ifInstructionSchema.thenId, builderAndRef[1]);
      break;
    }
    case InstructionType.IfElseInstruction: {
      const ifInstructionSchema = instructionSchema.instruction as unknown as IfElseInstructionSchema;
      const left = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.leftConstantName);
      const right = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.rightConstantName);
      if (!left || !right) {
        return [taskBuilder, InvalidScriptError("One or two of the two constants " + ifInstructionSchema.condition.leftConstantName + " and " + ifInstructionSchema.condition.rightConstantName + " are not declared before the If" )]
      }
      const builderAndRef = taskBuilder.addIfElse(nodeRef, left, right, deserializeConditionOperator(ifInstructionSchema.condition.conditionOperatorType), ifInstructionSchema.condition.negate);
      taskBuilder = builderAndRef[0];
      branchRefs.set(ifInstructionSchema.thenId, builderAndRef[1]);
      branchRefs.set(ifInstructionSchema.elseId, builderAndRef[2]);
      break;
    }
  }
  return [taskBuilder, err];
}
