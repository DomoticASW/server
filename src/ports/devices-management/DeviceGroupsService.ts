import { DeviceId } from "../../domain/devices-management/Device.js";
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js";
import { DeviceGroupNameAlreadyInUseError, DeviceGroupNotFoundError, DeviceNotFoundError } from "./Errors.js";
import { InvalidTokenError, TokenError } from "../permissions/Errors.js";
import { Token } from "../permissions/Token.js";
import { Result } from "option-t/plain_result";

export interface DeviceGroupsService {
    addGroup(token: Token, name: string): Result<DeviceGroupId, DeviceGroupNameAlreadyInUseError | TokenError>;
    removeGroup(token: Token, groupId: DeviceGroupId): Result<undefined, DeviceGroupNotFoundError | TokenError>;
    renameGroup(token: Token, groupId: DeviceGroupId, name: string): Result<undefined, DeviceGroupNotFoundError | DeviceGroupNameAlreadyInUseError | TokenError>;
    findGroup(token: Token, groupId: DeviceGroupId): Result<DeviceGroup, DeviceGroupNotFoundError | InvalidTokenError>;
    getAllDeviceGroups(token: Token): Result<Iterable<DeviceGroup>, InvalidTokenError>;
    addDeviceToGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Result<undefined, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError>;
    removeDeviceFromGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Result<undefined, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError>;
}
