import { DeviceGroupsService } from "../../ports/devices-management/DeviceGroupsService.js"
import { DeviceGroupNameAlreadyInUseError, DeviceGroupNotFoundError, DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { Repository } from "../../ports/Repository.js";
import { TokenError, InvalidTokenError } from "../../ports/users-management/Errors.js";
import { Token } from "../users-management/Token.js";
import { DeviceId } from "./Device.js";
import { DeviceGroupId, DeviceGroup } from "./DeviceGroup.js";
import { Effect, pipe } from "effect";

export class DeviceGroupsServiceImpl implements DeviceGroupsService {
    private repo: Repository<DeviceGroupId, DeviceGroup>
    constructor(repo: Repository<DeviceGroupId, DeviceGroup>) {
        this.repo = repo
    }
    addGroup(token: Token, name: string): Effect.Effect<DeviceGroupId, DeviceGroupNameAlreadyInUseError | TokenError> {
        const id = DeviceGroupId(name)
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
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
    }
    removeDeviceFromGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Effect.Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError> {
        throw new Error("Method not implemented.");
    }
}
