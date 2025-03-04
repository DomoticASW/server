import { DeviceGroupId, DeviceId } from "./Device.js";
import { DeviceGroup } from "./DeviceGroup.js";
import { DeviceGroupNameAlreadyInUseError, DeviceGroupNotFoundError, DeviceNotFoundError } from "./Errors.js";
import { InvalidTokenError, TokenError } from "../permissions/Errors.js";
import { Token } from "../permissions/Token.js";

export interface DeviceGroupsService {
    addGroup(token: Token, name: string): DeviceGroupId | DeviceGroupNameAlreadyInUseError | TokenError;
    removeGroup(token: Token, groupId: DeviceGroupId): DeviceGroupNotFoundError | TokenError | undefined;
    renameGroup(token: Token, groupId: DeviceGroupId, name: string): DeviceGroupNotFoundError | DeviceGroupNameAlreadyInUseError | TokenError | undefined;
    findGroup(token: Token, groupId: DeviceGroupId): DeviceGroup | DeviceGroupNotFoundError | InvalidTokenError;
    getAllDeviceGroups(token: Token): Iterable<DeviceGroup> | InvalidTokenError;
    addDeviceToGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): DeviceNotFoundError | DeviceGroupNotFoundError | TokenError | undefined;
    removeDeviceFromGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): DeviceNotFoundError | DeviceGroupNotFoundError | TokenError | undefined;
}
