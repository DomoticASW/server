import { Effect } from "effect";
import { DeviceActionsService } from "../../ports/devices-management/DeviceActionsService.js";
import { InvalidInputError, DeviceActionError, DeviceActionNotFound, DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { PermissionError } from "../../ports/permissions-management/Errors.js";
import { InvalidTokenError } from "../../ports/users-management/Errors.js";
import { Token } from "../users-management/Token.js";
import { DeviceId, DeviceActionId } from "./Device.js";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js";
import { UsersService } from "../../ports/users-management/UsersService.js";

export class DeviceActionsServiceImpl implements DeviceActionsService {

    constructor(
        private devicesService: DevicesService,
        private usersService: UsersService,
        private permissionsService: PermissionsService,
        private deviceCommunicationProtocol: DeviceCommunicationProtocol) {
    }

    executeAction(token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError | InvalidTokenError | PermissionError> {
        return Effect.Do.pipe(
            Effect.bind("_", () => this.usersService.verifyToken(token)),
            Effect.bind("__", () => this.permissionsService.canExecuteActionOnDevice(token, deviceId)),
            Effect.bind("___", () => this.executeAutomationAction(deviceId, actionId, input))
        )
    }
    executeAutomationAction(deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError> {
        return Effect.Do.pipe(
            Effect.bind("device", () => this.devicesService.findUnsafe(deviceId)),
            Effect.bind("_", ({ device }) => device.executeAction(actionId, input, this.deviceCommunicationProtocol))
        )
    }
}
