import express from "express";
import { ScriptsService } from "../../../ports/scripts-management/ScriptsService.js";
import { Effect } from "effect";
import { BadRequest, deserializeToken, handleCommonErrors, sendResponse, Response } from "./HttpUtils.js";
import { AutomationBuilder, AutomationBuilderWithDeviceEventTrigger, AutomationBuilderWithPeriodtrigger, ScriptBuilder, TaskBuilder } from "../../../domain/scripts-management/ScriptBuilder.js";
import { StatusCodes } from "http-status-codes";
import { ConstantRef, NodeRef } from "../../../domain/scripts-management/Refs.js";
import { Email } from "../../../domain/users-management/User.js";
import { Automation, AutomationId, Script, ScriptId, Task, TaskId } from "../../../domain/scripts-management/Script.js";
import { DeviceActionId, DeviceId, DevicePropertyId } from "../../../domain/devices-management/Device.js";
import { Type } from "../../../ports/devices-management/Types.js";
import { ConditionOperator } from "../../../domain/scripts-management/Instruction.js";
import { NumberEOperator, NumberGEOperator, NumberGOperator, NumberLEOperator, NumberLOperator, BooleanEOperator, StringEOperator, ColorEOperator } from "../../../domain/scripts-management/Operators.js";
import { InvalidScriptError, ScriptNotFoundError } from "../../../ports/scripts-management/Errors.js";
import { Token } from "../../../domain/users-management/Token.js";
import { InvalidTokenError } from "../../../ports/users-management/Errors.js";
import { PermissionError } from "../../../ports/permissions-management/Errors.js";
import { UsersService } from "../../../ports/users-management/UsersService.js";

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
  thenInstructions: InstructionSchema[],
  condition: ConditionSchema
}

interface IfElseInstructionSchema extends IfInstructionSchema {
  elseInstructions: InstructionSchema[]
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

interface PeriodTriggerSchema {
    start: string
    periodSeconds: number
}

interface DeviceEventTriggerSchema {
    deviceId: string
    eventName: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPeriodTrigger(o: any): o is PeriodTriggerSchema {
  return o &&
    typeof o === 'object' &&
    'start' in o && typeof o.start === "string" &&
    'periodSeconds' in o && typeof o.periodSeconds === "number"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDeviceEventTrigger(o: any): o is DeviceEventTriggerSchema {
  return o &&
    typeof o === 'object' &&
    'deviceId' in o && typeof o.deviceId === "string" &&
    'eventName' in o && typeof o.eventName === "number"
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
    'thenInstructions' in o && Array.isArray(o.thenInstructions) &&
    'condition' in o && isCondition(o.condition)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIfElseInstruction(o: any): o is IfElseInstructionSchema {
  return isIfInstruction(o) &&
    'elseInstructions' in o && Array.isArray(o.elseInstructions)
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
  /**
   * API to create a task.
   * 
   * The json body of the request must have 3 main elements:
   *    - "name": the name of the task
   *    - "instructions": ActualInstructions to be executed when the task starts
   * 
   * An example of a complete and successfull request could be this one:
   * {
   *    "name": "taskName",
   *    "instructions": [
   *      {
   *        "type": "CreateConstantInstruction",
   *        "instruction": {
   *          "name": "C1",
   *          "type": "IntType",
   *          "value": 10
   *        }
   *      },
   *      {
   *        "type": "CreateConstantInstruction",
   *        "instruction": {
   *          "type": "IntType",
   *          "name": "C2",
   *          "value": 10
   *        }
   *      },
   *      {
   *        "type": "IfElseInstruction",
   *        "instruction": {
   *          "thenInstructions": [
   *              {
   *                "type": "SendNotificationInstruction",
   *                "instruction": {
   *                  "email": "a@email.com",
   *                  "message" : "thenMessage1"
   *                }
   *              },
   *              {
   *                "type": "SendNotificationInstruction",
   *                "instruction": {
   *                  "email": "a@email.com",
   *                  "message" : "thenMessage2"
   *                }
   *              }
   *          ],
   *          "elseInstructions": [
   *              {
   *                "type": "SendNotificationInstruction",
   *                "instruction": {
   *                  "email": "a@email.com",
   *                  "message" : "elseMessage"
   *                }
   *              }
   *          ],
   *          "condition": {
   *            "leftConstantName": "C1",
   *            "rightConstantName": "C2",
   *            "negate": false,
   *            "conditionOperatorType": "NumberEOperator"
   *          }
   *        }
   *      }
   *    ]
   * }
   */
  app.post('/api/tasks', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("completeBuilder", () => completeBuilder(req, "task")),
      Effect.bind('taskId', ({token, completeBuilder}) => service.createTask(token, completeBuilder as TaskBuilder)),
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
      Effect.bind("completeBuilder", () => completeBuilder(req, "task")),
      Effect.bind("_", ({ token, completeBuilder }) => service.editTask(token, TaskId(req.params.id), completeBuilder as TaskBuilder)),
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
    const response = await deleteScript(req, usersService, (token) => service.removeTask(token, TaskId(req.params.id)))
    sendResponse(res, response)
  });

  // get one task
  app.get('/api/tasks/:id', async (req, res) => {
    const response = await getScript(req, usersService, (token) => service.findTask(token, TaskId(req.params.id)))
    sendResponse(res, response)
  });

  // get all tasks
  app.get('/api/tasks', async (req, res) => {
    const response = await getAllScripts(req, usersService, (token) => service.getAllTasks(token))
    sendResponse(res, response)
  });

  //create
  /**
   * API to create an automation.
   * 
   * The json body of the request must have 3 main elements:
   *    - "name": the name of the automation
   *    - "trigger": PeriodTrigger OR DeviceEventTrigger
   *    - "instructions": ActualInstructions to be executed when the automation starts
   * 
   * Remember: the date should be expressed as wanted from JavaScript Date, so something like
   * yyyy-mm-ddTh:m:s+02:00
   * The part after the '+', 02:00 in this case, is used to tell the time zone, so +02:00 means GMT+2
   * 
   * An example of a complete and successfull request could be this one:
   * {
   *    "name": "automationName",
   *    "trigger": {
   *      "start": "2025-06-02T15:00:00.000Z",
   *      "periodSeconds": 1
   *    },
   *    "instructions": [
   *      {
   *        "type": "CreateConstantInstruction",
   *        "instruction": {
   *          "name": "C1",
   *          "type": "IntType",
   *          "value": 10
   *        }
   *      },
   *      {
   *        "type": "CreateConstantInstruction",
   *        "instruction": {
   *          "type": "IntType",
   *          "name": "C2",
   *          "value": 10
   *        }
   *      },
   *      {
   *        "type": "IfElseInstruction",
   *        "instruction": {
   *          "thenInstructions": [
   *              {
   *                "type": "SendNotificationInstruction",
   *                "instruction": {
   *                  "email": "a@email.com",
   *                  "message" : "thenMessage1"
   *                }
   *              },
   *              {
   *                "type": "SendNotificationInstruction",
   *                "instruction": {
   *                  "email": "a@email.com",
   *                  "message" : "thenMessage2"
   *                }
   *              }
   *          ],
   *          "elseInstructions": [
   *              {
   *                "type": "SendNotificationInstruction",
   *                "instruction": {
   *                  "email": "a@email.com",
   *                  "message" : "elseMessage"
   *                }
   *              }
   *          ],
   *          "condition": {
   *            "leftConstantName": "C1",
   *            "rightConstantName": "C2",
   *            "negate": false,
   *            "conditionOperatorType": "NumberEOperator"
   *          }
   *        }
   *      }
   *    ]
   * }
   */
  app.post('/api/automations', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("completeBuilder", () => completeBuilder(req, "automation")),
      Effect.bind('taskId', ({token, completeBuilder}) => service.createAutomation(token, completeBuilder as AutomationBuilder)),
      Effect.map(({taskId}) => Response(StatusCodes.CREATED, { id: taskId})),
      Effect.catch("__brand", {
        failure: "InvalidScriptError",
        onFailure: (error) => Effect.succeed(Response(StatusCodes.BAD_REQUEST, error))
      }),
      Effect.catch("__brand", {
        failure: "AutomationNameAlreadyInUse",
        onFailure: error => Effect.succeed(Response(StatusCodes.CONFLICT, error))
      }),
      handleCommonErrors,
      Effect.runPromise
    )

    sendResponse(res, response)
  })

  // edit Automation
  app.patch('/api/automations/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("completeBuilder", () => completeBuilder(req, "automation")),
      Effect.bind("_", ({ token, completeBuilder }) => service.editAutomation(token, AutomationId(req.params.id), completeBuilder as AutomationBuilder)),
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
        failure: "AutomationNameAlreadyInUse",
        onFailure: error => Effect.succeed(Response(StatusCodes.CONFLICT, error))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  });

  // delete automation
  app.delete('/api/automations/:id', async (req, res) => {
    const response = await deleteScript(req, usersService, (token) => service.removeAutomation(token, AutomationId(req.params.id)))
    sendResponse(res, response)
  });

  // get one automation
  app.get('/api/automations/:id', async (req, res) => {
    const response = await getScript(req, usersService, (token) => service.findAutomation(token, AutomationId(req.params.id)))
    sendResponse(res, response)
  });

  // get all automations
  app.get('/api/automations', async (req, res) => {
    const response = await getAllScripts(req, usersService, (token) => service.getAllAutomations(token))
    sendResponse(res, response)
  });

  // enable or disable automation
  app.post('/api/automations/:id', async (req, res) => {
    const response = await Effect.Do.pipe(
      Effect.bind("token", () => deserializeToken(req, usersService)),
      Effect.bind("enable", () => Effect.if(req.body != undefined && "enable" in req.body, {
        onTrue: () => Effect.succeed(req.body.enable),
        onFalse: () => Effect.fail(BadRequest("Missing enable property in request body"))
      })),
      Effect.bind("_", ({token, enable}) => Effect.if(typeof enable === "boolean", {
        onTrue: () => service.setAutomationState(token, AutomationId(req.params.id), enable),
        onFalse: () => Effect.fail(BadRequest("Enable property must be a boolean"))
      })),
      Effect.map(() => Response(StatusCodes.OK)),
      Effect.catch("__brand", {
        failure: "ScriptNotFoundError",
        onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
      }),
      handleCommonErrors,
      Effect.runPromise
    )
    sendResponse(res, response)
  })
}

function deleteScript(req: express.Request, usersService: UsersService, fun: (token: Token) => Effect.Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError>) {
  return Effect.Do.pipe(
    Effect.bind("token", () => deserializeToken(req, usersService)),
    Effect.bind("_", ({ token }) => fun(token)),
    Effect.map(() => Response(StatusCodes.OK)),
    Effect.catch("__brand", {
      failure: "ScriptNotFoundError",
      onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
    }),
    handleCommonErrors,
    Effect.runPromise
  );
}

function getScript(req: express.Request, usersService: UsersService, fun: (token: Token) => Effect.Effect<Script<ScriptId>, InvalidTokenError | ScriptNotFoundError>) {
  return Effect.Do.pipe(
    Effect.bind("token", () => deserializeToken(req, usersService)),
    Effect.bind("task", ({ token }) => fun(token)),
    Effect.map(({ task }) => Response(StatusCodes.OK, task)),
    Effect.catch("__brand", {
      failure: "ScriptNotFoundError",
      onFailure: (err) => Effect.succeed(Response(StatusCodes.NOT_FOUND, err))
    }),
    handleCommonErrors,
    Effect.runPromise
  );
}

function getAllScripts(req: express.Request, usersService: UsersService, fun: (token: Token) => Effect.Effect<Iterable<Script<ScriptId>>, InvalidTokenError>) {
  return Effect.Do.pipe(
    Effect.bind("token", () => deserializeToken(req, usersService)),
    Effect.bind("automations", ({ token }) => fun(token)),
    Effect.map(({ automations }) => Response(StatusCodes.CREATED, Array.from(automations))),
    handleCommonErrors,
    Effect.runPromise
  )
}

function completeBuilder(req: express.Request, type: "task" | "automation"): Effect.Effect<TaskBuilder | AutomationBuilder, BadRequest | InvalidScriptError> {
  return Effect.Do.pipe(
    Effect.bind("scriptNameVal", () => Effect.if(req.body != undefined && "name" in req.body, {
      onTrue: () => Effect.succeed(req.body.name),
      onFalse: () => Effect.fail(BadRequest("Missing task name property in request body"))
    })),
    Effect.bind("scriptName", ({ scriptNameVal }) => {
      if (typeof scriptNameVal == "string") { return Effect.succeed(scriptNameVal) }
      else { return Effect.fail(BadRequest(`Expected task name of type string but found ${typeof scriptNameVal}`)) }
    }),
    Effect.bind("trigger", () => Effect.if(type == "automation" && "trigger" in req.body, {
      onTrue: () => Effect.succeed(req.body.trigger),
      onFalse: () => Effect.if(type == "task", {
        onTrue: () => Effect.succeed(undefined),
        onFalse: () => Effect.fail(BadRequest("Missing trigger for the automation"))
      })
    })),
    Effect.bind("builderAndRef", ({ scriptName, trigger }) => 
      Effect.if(type == "task", {
        onTrue: () => Effect.succeed(TaskBuilder(scriptName)),
        onFalse: () =>
          Effect.if(isPeriodTrigger(trigger), {
            onTrue: () => Effect.succeed(AutomationBuilderWithPeriodtrigger(scriptName, new Date(trigger.start), trigger.periodSeconds)),
            onFalse: () =>
              Effect.if(isDeviceEventTrigger(trigger), {
                onTrue: () => Effect.succeed(AutomationBuilderWithDeviceEventTrigger(scriptName, DeviceId(trigger.deviceId), trigger.eventName)),
                onFalse: () => Effect.fail(BadRequest("Trigger is neither a period trigger nor a device event trigger"))
              })
          })
      })
    ),
    Effect.bind("instructions", () => Effect.if("instructions" in req.body, {
      onTrue: () => Effect.succeed(req.body.instructions),
      onFalse: () => Effect.succeed([])
    })),
    Effect.bind("instructionsSchemas", ({ instructions }) => createInstructionsSchemas(instructions)),
    Effect.flatMap(({ instructionsSchemas, builderAndRef }) => Effect.if(type == "task", {
      onTrue: () => createBuilderWithInstructions(builderAndRef as unknown as [TaskBuilder, NodeRef], instructionsSchemas),
      onFalse: () => createBuilderWithInstructions(builderAndRef as unknown as [AutomationBuilder, NodeRef], instructionsSchemas)
    }))
  )
}

function createBuilderWithInstructions<S = Task | Automation>(builderAndRef: [ScriptBuilder<S>, NodeRef], instructionsSchemas: Array<InstructionSchema>): Effect.Effect<ScriptBuilder<S>, BadRequest | InvalidScriptError> {
  let taskBuilderAndErr: [ScriptBuilder<S>, BadRequest | InvalidScriptError | undefined] = [builderAndRef[0], undefined]
  const root = builderAndRef[1]
  const constRefs: Array<ConstantRef> = []

  for (const instructionSchema of instructionsSchemas) {
    taskBuilderAndErr = createBuilderFromInstructionAndRef(taskBuilderAndErr[0]!, instructionSchema, root, constRefs);
    if (taskBuilderAndErr[1] != undefined) {
      return Effect.fail(taskBuilderAndErr[1])
    }
  }
  return Effect.succeed(taskBuilderAndErr[0])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createInstructionsSchemas(instructions: any) {
  const instructionsSchema: Array<InstructionSchema> = []
  if (Array.isArray(instructions)) {
    for (const instruction of instructions) {
      if (isInstruction(instruction)) {
        instructionsSchema.push(instruction);
      } else {
        return Effect.fail(BadRequest("One or more instructions have invalid shape"))
      }
    }
  } else {
    return Effect.fail(BadRequest("The instructions must be an array"))
  }
  return Effect.succeed(instructions)
}

function createBuilderFromInstructionAndRef<S = Task | Automation>(builder: ScriptBuilder<S>, instructionSchema: InstructionSchema, nodeRef: NodeRef, constRefs: ConstantRef[]): [ScriptBuilder<S>, BadRequest | InvalidScriptError | undefined] {
  let err: BadRequest | InvalidScriptError | undefined
  switch (instructionSchema.type) {
    case InstructionType.SendNotificationInstruction: {
      if (!isSendNotificationInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create a send notification instruction, but the shape is not the right one")]
      }
      const instruction = instructionSchema.instruction as unknown as SendNotificationInstructionSchema;
      builder = builder.addSendNotification(nodeRef, Email(instruction.email), instruction.message);
      break;
    }
    case InstructionType.WaitInstruction: {
      if (!isWaitInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create a wait instruction, but the shape is not the right one")]
      }
      const instruction = instructionSchema.instruction as unknown as WaitInstructionSchema;
      builder = builder.addWait(nodeRef, instruction.seconds);
      break;
    }
    case InstructionType.StartTaskInstruction: {
      if (!isStartTaskInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create a start task instruction, but the shape is not the right one")]
      }
      const instruction = instructionSchema.instruction as unknown as StartTaskInstructionSchema;
      builder = builder.addStartTask(nodeRef, TaskId(instruction.taskId));
      break;
    }
    case InstructionType.DeviceActionInstruction: {
      if (!isDeviceActionInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create a device action instruction, but the shape is not the right one")]
      }
      const instruction = instructionSchema.instruction as unknown as DeviceActionInstructionSchema;
      builder = builder.addDeviceAction(nodeRef, DeviceId(instruction.deviceId), DeviceActionId(instruction.deviceActionId), instruction.input);
      break;
    }
    case InstructionType.CreateConstantInstruction: {
      if (!isCreateConstantInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create a create constant instruction, but the shape is not the right one")]
      }
      const instruction = instructionSchema.instruction as unknown as CreateConstantInstructionSchema;
      const builderAndRef = builder.addCreateConstant(nodeRef, instruction.name, instruction.type, instruction.value);
      builder = builderAndRef[0];
      constRefs.push(builderAndRef[1]);
      break;
    }
    case InstructionType.CreateDevicePropertyConstantInstruction: {
      if (!isCreateDevicePropertyConstantInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create a create device property constant instruction, but the shape is not the right one")]
      }
      const instruction = instructionSchema.instruction as unknown as CreateDevicePropertyConstantInstructionSchema;
      const builderAndRef = builder.addCreateDevicePropertyConstant(nodeRef, instruction.name, instruction.type, DeviceId(instruction.deviceId), DevicePropertyId(instruction.devicePropertyId));
      builder = builderAndRef[0];
      constRefs.push(builderAndRef[1]);
      break;
    }
    case InstructionType.IfInstruction: {
      if (!isIfInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create an if instruction, but the shape is not the right one")]
      }
      const ifInstructionSchema = instructionSchema.instruction as unknown as IfInstructionSchema;
      const left = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.leftConstantName);
      const right = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.rightConstantName);
      if (!left || !right) {
        return [builder, InvalidScriptError("One or two of the two constants " + ifInstructionSchema.condition.leftConstantName + " and " + ifInstructionSchema.condition.rightConstantName + " are not declared before the If" )]
      }
      const builderAndRef = builder.addIf(nodeRef, left, right, deserializeConditionOperator(ifInstructionSchema.condition.conditionOperatorType), ifInstructionSchema.condition.negate);
      builder = builderAndRef[0];
      const then = builderAndRef[1]
      const thenBuilderAndErr = putBranchInstructionsToBuilder(ifInstructionSchema.thenInstructions, builder, then, constRefs)
      builder = thenBuilderAndErr[0]
      err = thenBuilderAndErr[1]
      break;
    }
    case InstructionType.IfElseInstruction: {
      if (!isIfElseInstruction(instructionSchema.instruction)) {
        return [builder, BadRequest("It has been tried to create an if else instruction, but the shape is not the right one")]
      }
      const ifInstructionSchema = instructionSchema.instruction as unknown as IfElseInstructionSchema;
      const left = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.leftConstantName);
      const right = constRefs.find(ref => ref.constantInstruction.name == ifInstructionSchema.condition.rightConstantName);
      if (!left || !right) {
        return [builder, InvalidScriptError("One or two of the two constants " + ifInstructionSchema.condition.leftConstantName + " and " + ifInstructionSchema.condition.rightConstantName + " are not declared before the If" )]
      }
      const builderAndRef = builder.addIfElse(nodeRef, left, right, deserializeConditionOperator(ifInstructionSchema.condition.conditionOperatorType), ifInstructionSchema.condition.negate);
      builder = builderAndRef[0];
      const then = builderAndRef[1];
      const elseRef = builderAndRef[2]
  
      const thenBuilderAndErr = putBranchInstructionsToBuilder(ifInstructionSchema.thenInstructions, builder, then, constRefs)
      //Return immediatly the error in case there is one
      if (thenBuilderAndErr[1] != undefined) {
        return thenBuilderAndErr
      } else {
        builder = thenBuilderAndErr[0]
      }

      const elseBuilderAndErr = putBranchInstructionsToBuilder(ifInstructionSchema.elseInstructions, builder, elseRef, constRefs)
      builder = elseBuilderAndErr[0]
      err = elseBuilderAndErr[1]
      break;
    }
  }
  return [builder, err];
}

function putBranchInstructionsToBuilder<S = Task | Automation>(instructions: InstructionSchema[], builder: ScriptBuilder<S>, nodeRef: NodeRef, constRefs: ConstantRef[]): [ScriptBuilder<S>, BadRequest | InvalidScriptError | undefined] {
  let newBuilder = builder
  for (const instruction of instructions) {
    const newBuilderAndErr = createBuilderFromInstructionAndRef(newBuilder, instruction, nodeRef, constRefs)
    newBuilder = newBuilderAndErr[0]
    const err = newBuilderAndErr[1]
    if (err != undefined) {
      return [newBuilder, err]
    }
  }
  return [newBuilder, undefined]
}