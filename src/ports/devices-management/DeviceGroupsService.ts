import { DeviceId } from "../../domain/devices-management/Device.js"
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js"
import {
  DeviceGroupNameAlreadyInUseError,
  DeviceGroupNotFoundError,
  DeviceNotFoundError,
} from "./Errors.js"
import { Effect } from "effect/Effect"
import { InvalidTokenError, TokenError } from "../users-management/Errors.js"
import { Token } from "../../domain/users-management/Token.js"

export interface DeviceGroupsService {
  addGroup(
    token: Token,
    name: string
  ): Effect<DeviceGroupId, DeviceGroupNameAlreadyInUseError | TokenError>
  removeGroup(
    token: Token,
    groupId: DeviceGroupId
  ): Effect<void, DeviceGroupNotFoundError | TokenError>
  renameGroup(
    token: Token,
    groupId: DeviceGroupId,
    name: string
  ): Effect<void, DeviceGroupNotFoundError | DeviceGroupNameAlreadyInUseError | TokenError>
  findGroup(
    token: Token,
    groupId: DeviceGroupId
  ): Effect<DeviceGroup, DeviceGroupNotFoundError | InvalidTokenError>
  getAllDeviceGroups(token: Token): Effect<Iterable<DeviceGroup>, InvalidTokenError>
  addDeviceToGroup(
    token: Token,
    deviceId: DeviceId,
    groupId: DeviceGroupId
  ): Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError>
  removeDeviceFromGroup(
    token: Token,
    deviceId: DeviceId,
    groupId: DeviceGroupId
  ): Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError>
}
