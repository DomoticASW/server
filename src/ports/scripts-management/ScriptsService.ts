import { Effect } from "effect/Effect";
import { Automation, AutomationId, Task, TaskId } from "../../domain/scripts-management/Script.js";
import { Token } from "../../domain/users-management/Token.js";
import { InvalidTokenError } from "../users-management/Errors.js";
import { AutomationNameAlreadyInUse, InvalidAutomationError, InvalidTaskError, ScriptNotFoundError, TaskNameAlreadyInUse } from "./Errors.js";
<<<<<<< HEAD:src/ports/scripts/ScriptsService.ts
import { TaskBuilder } from "../../domain/scripts/ScriptBuilder.js";
import { PermissionError } from "../permissions-management/Errors.js";
=======
import { TaskBuilder } from "../../domain/scripts-management/ScriptBuilder.js";
import { PermissionError } from "../permissions/Errors.js";
>>>>>>> a9fd43e (chore: changed names of packages of scripts into scripts-management):src/ports/scripts-management/ScriptsService.ts

export interface ScriptsService {
  findTask(token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError>
  findTaskUnsafe(taskId: TaskId): Effect<Task, ScriptNotFoundError>

  getAllTasks(token: Token): Effect<Iterable<Task>, InvalidTokenError>
  createTask(token: Token, task: TaskBuilder): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUse | InvalidTaskError>
  editTask(token: Token, taskId: TaskId, task: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | TaskNameAlreadyInUse | InvalidTaskError>
  startTask(token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError>

  findAutomation(token: Token, automationId: AutomationId): Effect<Automation, InvalidTokenError | ScriptNotFoundError>
  getAllAutomations(token: Token): Effect<Iterable<Automation>, InvalidTokenError>
  createAutomation(token: Token, automation: TaskBuilder): Effect<AutomationId, InvalidTokenError | ScriptNotFoundError | AutomationNameAlreadyInUse | InvalidAutomationError>
  editAutomation(token: Token, automationId: AutomationId, automation: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | AutomationNameAlreadyInUse | InvalidAutomationError>
  setAutomationState(token: Token, automationId: AutomationId, enable: boolean): Effect<void, InvalidTokenError | ScriptNotFoundError>
}