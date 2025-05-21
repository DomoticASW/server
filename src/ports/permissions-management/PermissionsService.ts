import { Effect } from "effect/Effect";
import { Email } from "../../domain/users-management/User.js";
import { DeviceNotFoundError } from "../devices-management/Errors.js"
import { InvalidTokenError, TokenError, UserNotFoundError } from "../users-management/Errors.js"
import { InvalidOperationError, PermissionError, TaskNotFoundError } from "./Errors.js";
import { Token } from "../../domain/users-management/Token.js";
import { ScriptId, TaskId } from "../../domain/scripts-management/Script.js"
import { DeviceId } from "../../domain/devices-management/Device.js";
import { ScriptNotFoundError } from "../scripts-management/Errors.js";

export interface PermissionsService {
  addUserDevicePermission(token: Token, email: Email, devideId: DeviceId): Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError>;
  removeUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError>;
  canExecuteActionOnDevice(token: Token, deviceId: DeviceId): Effect<void, PermissionError | InvalidTokenError>;
  canExecuteTask(token: Token, taskId: TaskId): Effect<void, PermissionError | InvalidTokenError | TaskNotFoundError>;
  canEdit(token: Token, scriptId: ScriptId): Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError>;
  addToEditlist(token: Token, email: Email, scriptId: ScriptId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError>;
  removeFromEditlist(token: Token, email: Email, scriptId: ScriptId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError>;
  addToWhitelist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError>;
  removeFromWhitelist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError>;
  addToBlacklist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError | InvalidOperationError>;
  removeFromBlacklist(token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError>;
}