import { Result } from "option-t/plain_result";
import { Email } from "../users-management/User.js";
import { DeviceId } from "../devices-management/Device.js";
import { DeviceNotFoundError } from "../devices-management/Errors.js"
import { InvalidTokenError, TokenError, UserNotFoundError } from "../users-management/Errors.js"
import { ScriptNotFoundError } from "../scripts/Errors.js"
import { PermissionError } from "./Errors.js";
import { Token } from "../users-management/Token.js";
import { TaskId } from "../scripts/Task.js";
import { ScriptId } from "../scripts/Script.js"

export interface PermissionsService {
  addUserDevicePermission(token: Token, email: Email, devideId: DeviceId): Result<undefined, UserNotFoundError | DeviceNotFoundError | TokenError>;
  removeUserDevicePermission(token: Token, email: Email, deviceId: DeviceId): Result<undefined, UserNotFoundError | DeviceNotFoundError | TokenError>;
  canExecuteActionOnDevice(token: Token, deviceId: DeviceId): Result<undefined, PermissionError | InvalidTokenError>;
  canExecuteTask(token: Token, taskId: TaskId): Result<undefined, PermissionError | InvalidTokenError>;
  canEdit(token: Token, scriptId: ScriptId): Result<undefined, PermissionError | InvalidTokenError>;
  addToEditlist(token: Token, email: Email, scriptId: ScriptId): Result<undefined, TokenError | UserNotFoundError | ScriptNotFoundError>;
  removeFromEditlist(token: Token, email: Email, scriptId: ScriptId): Result<undefined, TokenError | UserNotFoundError | ScriptNotFoundError>;
  addToWhitelist(token: Token, email: Email, taskId: TaskId): Result<undefined, TokenError | UserNotFoundError | ScriptNotFoundError>;
  removeFromWhitelist(token: Token, email: Email, taskId: TaskId): Result<undefined, TokenError | UserNotFoundError | ScriptNotFoundError>;
  addToBlacklist(token: Token, email: Email, taskId: TaskId): Result<undefined, TokenError | UserNotFoundError | ScriptNotFoundError>;
  removeFromBlacklist(token: Token, email: Email, taskId: TaskId): Result<undefined, TokenError | UserNotFoundError | ScriptNotFoundError>;
}