import { Effect } from "effect/Effect";
import { Email } from "../../domain/users-management/User.js";
import { DeviceNotFoundError } from "../devices-management/Errors.js"
import { InvalidTokenError, TokenError, UserNotFoundError } from "../users-management/Errors.js"
import { EditListNotFoundError, InvalidOperationError, PermissionError, TaskListsNotFoundError, UserDevicePermissionNotFoundError } from "./Errors.js";
import { Token } from "../../domain/users-management/Token.js";
import { ScriptId, TaskId } from "../../domain/scripts-management/Script.js"
import { DeviceId } from "../../domain/devices-management/Device.js";
import { ScriptNotFoundError } from "../scripts-management/Errors.js";
import { ScriptsService } from "../scripts-management/ScriptsService.js";
import { EditList } from "../../domain/permissions-management/EditList.js";
import { UserDevicePermission } from "../../domain/permissions-management/UserDevicePermission.js";
import { TaskLists } from "../../domain/permissions-management/TaskLists.js";

export interface PermissionsService {
  registerScriptService(scriptService: ScriptsService): void;
  findUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect<UserDevicePermission, TokenError | UserDevicePermissionNotFoundError>;
  getAllUserDevicePermissions(token: Token): Effect<Iterable<UserDevicePermission>, TokenError>;
  addUserDevicePermission(token: Token, email: Email, devideId: DeviceId): Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError>;
  removeUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError>;
  canExecuteActionOnDevice(token: Token, deviceId: DeviceId): Effect<void, PermissionError | InvalidTokenError>;
  canExecuteTask(token: Token, taskId: TaskId): Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError>;
  canEdit(token: Token, scriptId: ScriptId): Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError>;
  findEditList(token: Token, scriptId: ScriptId): Effect<EditList, TokenError | EditListNotFoundError>;
  getAllEditLists(token: Token): Effect<Iterable<EditList>, TokenError>;
  addToEditlist(token: Token, email: Email, scriptId: ScriptId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | EditListNotFoundError>;
  addToEditlistUnsafe(email: Email, scriptId: ScriptId): Effect<void, UserNotFoundError | ScriptNotFoundError | EditListNotFoundError>;
  removeFromEditlist(token: Token, email: Email, scriptId: ScriptId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | EditListNotFoundError>;
  findTaskLists(token: Token, taskId: TaskId): Effect<TaskLists, TokenError | TaskListsNotFoundError>;
  getAllTaskLists(token: Token): Effect<Iterable<TaskLists>, TokenError>;
  addToWhitelist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError>;
  removeFromWhitelist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError>;
  addToBlacklist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError>;
  removeFromBlacklist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError>;
}