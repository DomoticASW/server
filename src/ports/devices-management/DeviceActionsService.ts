import { Effect } from "effect/Effect";
import { DeviceId, DeviceActionId } from "../../domain/devices-management/Device.js";
import { Token } from "../../domain/users-management/Token.js";
import { PermissionError } from "../permissions-management/Errors.js";
import { InvalidTokenError } from "../users-management/Errors.js";
import { InvalidInputError, DeviceActionError, DeviceActionNotFound, DeviceNotFoundError } from "./Errors.js";

export interface DeviceActionsService {
    executeAction(token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError | InvalidTokenError | PermissionError>;
    executeAutomationAction(deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError>;
}
