import { Effect } from "effect/Effect";
import { Automation, AutomationId, Task, TaskId } from "../../domain/scripts-management/Script.js";
import { Token } from "../../domain/users-management/Token.js";
import { InvalidTokenError } from "../users-management/Errors.js";
import { AutomationNameAlreadyInUseError, InvalidScriptError, ScriptNotFoundError, TaskNameAlreadyInUseError } from "./Errors.js";
import { AutomationBuilder, TaskBuilder } from "../../domain/scripts-management/ScriptBuilder.js";
import { PermissionError } from "../permissions-management/Errors.js";

export interface ScriptsService {
  findTask(token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError>
  findTaskUnsafe(taskId: TaskId): Effect<Task, ScriptNotFoundError>

  getAllTasks(token: Token): Effect<Iterable<Task>, InvalidTokenError>
  createTask(token: Token, task: TaskBuilder): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUseError | InvalidScriptError>
  editTask(token: Token, taskId: TaskId, task: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | TaskNameAlreadyInUseError | InvalidScriptError>
  startTask(token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError>
  removeTask(token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError>
  
  findAutomation(token: Token, automationId: AutomationId): Effect<Automation, InvalidTokenError | ScriptNotFoundError>
  getAllAutomations(token: Token): Effect<Iterable<Automation>, InvalidTokenError>
  createAutomation(token: Token, automation: AutomationBuilder): Effect<AutomationId, InvalidTokenError | AutomationNameAlreadyInUseError | InvalidScriptError | PermissionError>
  editAutomation(token: Token, automationId: AutomationId, automation: AutomationBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | AutomationNameAlreadyInUseError | InvalidScriptError>
  setAutomationState(token: Token, automationId: AutomationId, enable: boolean): Effect<void, InvalidTokenError | ScriptNotFoundError>
  removeAutomation(token: Token, automationId: AutomationId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError>
}