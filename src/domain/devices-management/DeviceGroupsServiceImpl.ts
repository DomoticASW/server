import { DeviceGroupsService } from "../../ports/devices-management/DeviceGroupsService.js"
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { DeviceGroupNameAlreadyInUseError, DeviceGroupNotFoundError, DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { Repository } from "../../ports/Repository.js";
import { TokenError, InvalidTokenError, UnauthorizedError } from "../../ports/users-management/Errors.js";
import { UsersService } from "../../ports/users-management/UserService.js";
import { Token } from "../users-management/Token.js";
import { Role } from "../users-management/User.js";
import { DeviceId } from "./Device.js";
import { DeviceGroupId, DeviceGroup } from "./DeviceGroup.js";
import { Effect, pipe } from "effect";
import * as uuid from "uuid";

export class DeviceGroupsServiceImpl implements DeviceGroupsService {
    private repo: Repository<DeviceGroupId, DeviceGroup>
    private devicesService: DevicesService;
    private usersService: UsersService;
    constructor(repo: Repository<DeviceGroupId, DeviceGroup>, devicesService: DevicesService, usersService: UsersService) {
        this.repo = repo
        this.devicesService = devicesService
        this.usersService = usersService
    }
    addGroup(token: Token, name: string): Effect.Effect<DeviceGroupId, DeviceGroupNameAlreadyInUseError | TokenError> {
        const id = DeviceGroupId(uuid.v4())
        return pipe(
            Effect.if(token.role == Role.Admin, {
                onTrue: () => this.usersService.verifyToken(token),
                onFalse: () => Effect.fail(UnauthorizedError())
            }),
            Effect.flatMap(() => this.repo.add(DeviceGroup(id, name, []))),
            Effect.mapError(e => {
                switch (e.__brand) {
                    case "DuplicateIdError":
                    case "UniquenessConstraintViolatedError":
                        return DeviceGroupNameAlreadyInUseError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.map(() => id)
        )
    }
    removeGroup(token: Token, groupId: DeviceGroupId): Effect.Effect<void, DeviceGroupNotFoundError | TokenError> {
        return pipe(
            Effect.if(token.role == Role.Admin, {
                onTrue: () => this.usersService.verifyToken(token),
                onFalse: () => Effect.fail(UnauthorizedError())
            }),
            Effect.flatMap(() => this.repo.remove(groupId)),
            Effect.mapError(e => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceGroupNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
        )
    }
    renameGroup(token: Token, groupId: DeviceGroupId, name: string): Effect.Effect<void, DeviceGroupNotFoundError | DeviceGroupNameAlreadyInUseError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("", () => Effect.if(token.role == Role.Admin, {
                onTrue: () => this.usersService.verifyToken(token),
                onFalse: () => Effect.fail(UnauthorizedError())
            })),
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
            this.usersService.verifyToken(token),
            Effect.flatMap(() => this.repo.find(groupId)),
            Effect.mapError(e => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceGroupNotFoundError(e.cause)
                    case "InvalidTokenError":
                        return e
                }
            })
        )
    }
    getAllDeviceGroups(token: Token): Effect.Effect<Iterable<DeviceGroup>, InvalidTokenError> {
        return pipe(
            this.usersService.verifyToken(token),
            Effect.flatMap(() => this.repo.getAll())
        )
    }
    addDeviceToGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Effect.Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("", () => Effect.if(token.role == Role.Admin, {
                onTrue: () => this.usersService.verifyToken(token),
                onFalse: () => Effect.fail(UnauthorizedError())
            })),
            Effect.bind("group", () => this.findGroup(token, groupId)),
            Effect.bind("device", () => this.devicesService.find(token, deviceId)),
            Effect.bind("_", ({ group }) => {
                group.addDeviceToGroup(deviceId)
                return this.repo.update(group)
            }),
            Effect.catch("__brand", {
                failure: "UniquenessConstraintViolatedError",
                onFailure: (e) => Effect.dieMessage("Unexpected error while adding a device to a device group: " + e)
            }),
            Effect.mapError(e => {
                switch (e.__brand) {
                    case "DeviceGroupNotFoundError":
                    case "NotFoundError":
                        return DeviceGroupNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.asVoid
        )
    }
    removeDeviceFromGroup(token: Token, deviceId: DeviceId, groupId: DeviceGroupId): Effect.Effect<void, DeviceNotFoundError | DeviceGroupNotFoundError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("", () => Effect.if(token.role == Role.Admin, {
                onTrue: () => this.usersService.verifyToken(token),
                onFalse: () => Effect.fail(UnauthorizedError())
            })),
            Effect.bind("group", () => this.findGroup(token, groupId)),
            Effect.bind("device", () => this.devicesService.find(token, deviceId)),
            Effect.bind("_", ({ group }) => {
                group.removeDeviceFromGroup(deviceId)
                return this.repo.update(group)
            }),
            Effect.catch("__brand", {
                failure: "UniquenessConstraintViolatedError",
                onFailure: (e) => Effect.dieMessage("Unexpected error while adding a device to a device group: " + e)
            }),
            Effect.mapError(e => {
                switch (e.__brand) {
                    case "DeviceGroupNotFoundError":
                    case "NotFoundError":
                        return DeviceGroupNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.asVoid
        )
    }
}
