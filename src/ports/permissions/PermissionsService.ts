import { UserId } from "../users-management/User.js";
import { DeviceId } from "../devices-management/Device.js";
import { DeviceNotFoundError } from "../devices-management/Errors.js"
import { UserNotFoundError } from "../users-management/Errors.js"
import { ScriptNotFoundError } from "../scripts/Errors.js"
import { InvalidTokenError, PermissionError, TokenError } from "./Errors.js";
import { Token } from "../users-management/Token.js";
import { TaskId } from "../scripts/Task.js";
import { ScriptId } from "../scripts/Script.js"

export interface PermissionsService {
  addUserDevicePermission(token: Token, userId: UserId, devideId: DeviceId): UserNotFoundError | DeviceNotFoundError | TokenError | undefined;
  removeUserDevicePermission(token: Token, userId: UserId, deviceId: DeviceId): UserNotFoundError | DeviceNotFoundError | TokenError | undefined;
  canExecuteActionOnDevice(token: Token, deviceId: DeviceId): PermissionError | InvalidTokenError | undefined;
  canExecuteTask(token: Token, taskId: TaskId): PermissionError | InvalidTokenError | undefined;
  canEdit(token: Token, scriptId: ScriptId): PermissionError | InvalidTokenError | undefined;
  addToEditlist(token: Token, userId: UserId, scriptId: ScriptId): TokenError | UserNotFoundError | ScriptNotFoundError | undefined;
  removeFromEditlist(token: Token, userId: UserId, scriptId: ScriptId): TokenError | UserNotFoundError | ScriptNotFoundError | undefined;
  addToWhitelist(token: Token, userId: UserId, taskId: TaskId): TokenError | UserNotFoundError | ScriptNotFoundError | undefined;
  removeFromWhitelist(token: Token, userId: UserId, taskId: TaskId): TokenError | UserNotFoundError | ScriptNotFoundError | undefined;
  addToBlacklist(token: Token, userId: UserId, taskId: TaskId): TokenError | UserNotFoundError | ScriptNotFoundError | undefined;
  removeFromBlacklist(token: Token, userId: UserId, taskId: TaskId): TokenError | UserNotFoundError | ScriptNotFoundError | undefined;
}