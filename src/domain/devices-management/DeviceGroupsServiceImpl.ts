import { DeviceGroupsService } from "../../ports/devices-management/DeviceGroupsService.js"
import { DeviceGroupNameAlreadyInUseError, DeviceGroupNotFoundError, DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { Repository } from "../../ports/Repository.js";
import { TokenError, InvalidTokenError } from "../../ports/users-management/Errors.js";
import { Token } from "../users-management/Token.js";
import { DeviceId } from "./Device.js";
import { DeviceGroupId, DeviceGroup } from "./DeviceGroup.js";
import { Effect, pipe } from "effect";
import * as uuid from "uuid";

export class DeviceGroupsServiceImpl implements DeviceGroupsService {
    private repo: Repository<DeviceGroupId, DeviceGroup>
    constructor(repo: Repository<DeviceGroupId, DeviceGroup>) {
        this.repo = repo
    }
    addGroup(token: Token, name: string): Effect.Effect<DeviceGroupId, DeviceGroupNameAlreadyInUseError | TokenError> {
        const id = DeviceGroupId(uuid.v4())
        return pipe(
            this.repo.add(DeviceGroup(id, name, [])),
            Effect.mapError(e => DeviceGroupNameAlreadyInUseError(e.cause)),
            Effect.map(() => id)
        )
    }
    removeGroup(token: Token, groupId: DeviceGroupId): Effect.Effect<void, DeviceGroupNotFoundError | TokenError> {
        return pipe(
            this.repo.remove(groupId),
            Effect.mapError(e => DeviceGroupNotFoundError(e.cause)),
        )
    }
    renameGroup(token: Token, groupId: DeviceGroupId, name: string): Effect.Effect<void, DeviceGroupNotFoundError | DeviceGroupNameAlreadyInUseError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("group", () => this.findGroup(token, groupId)),
            Effect.bind("_", ({ group }) => {
                group.name = name
                return this.repo.update(group)
            }),
            Effect.mapError(e => {
                switch (e.__brand) {
                    case "UniquenessConstraintViolatedError":
                        return DeviceGroupNameAlreadyInUseError()
                    case "NotFoundError":
                        return DeviceGroupNotFoundError()
                    default:
                        return e
                }
            }),
            Effect.asVoid
        )
    }
    findGroup(token: Token, groupId: DeviceGroupId): Effect.Effect<DeviceGroup, DeviceGroupNotFoundError | InvalidTokenError> {
        return pipe(
            this.repo.find(groupId),
            Effect.mapError(e => DeviceGroupNotFoundError(e.cause))
        )
    }
    getAllDeviceGroups(token: Token): Effect.Effect<Iterable<DeviceGroup>, InvalidTokenError> {
        return this.repo.getAll()
    }
    addDeviceToGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Effect.Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("group", () => this.findGroup(token, groupId)),
            Effect.bind("_", ({ group }) => {
                group.addDeviceToGroup(deviceId)
                return this.repo.update(group)
            }),
            Effect.catch("__brand", {
                failure: "UniquenessConstraintViolatedError",
                onFailure: (e) => Effect.dieMessage("Unexpected error while adding a device to a device group: " + e)
            }),
            Effect.mapError(() => DeviceGroupNotFoundError()),
            Effect.asVoid
        )
    }
    removeDeviceFromGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Effect.Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("group", () => this.findGroup(token, groupId)),
            Effect.bind("_", ({ group }) => {
                group.removeDeviceFromGroup(deviceId)
                return this.repo.update(group)
            }),
            Effect.catch("__brand", {
                failure: "UniquenessConstraintViolatedError",
                onFailure: (e) => Effect.dieMessage("Unexpected error while adding a device to a device group: " + e)
            }),
            Effect.mapError(() => DeviceGroupNotFoundError()),
            Effect.asVoid
        )
    }
}
