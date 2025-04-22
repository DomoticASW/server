import { Effect, pipe } from "effect";
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../ports/devices-management/DevicesService.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DevicePropertyNotFound, DeviceAlreadyRegisteredError } from "../../ports/devices-management/Errors.js";
import { PermissionError } from "../../ports/permissions-management/Errors.js";
import { TokenError, InvalidTokenError } from "../../ports/users-management/Errors.js";
import { Token } from "../users-management/Token.js";
import { DeviceId, Device, DeviceActionId, DevicePropertyId } from "./Device.js";
import { Repository } from "../../ports/Repository.js";
import { DeviceFactory } from "../../ports/devices-management/DeviceFactory.js";

export class DevicesServiceImpl implements DevicesService {
    private repo: Repository<DeviceId, Device>
    private deviceFactory: DeviceFactory
    constructor(repository: Repository<DeviceId, Device>, deviceFactory: DeviceFactory) {
        this.repo = repository
        this.deviceFactory = deviceFactory
    }

    // TODO: add new error to doc diagrams
    add(token: Token, deviceUrl: URL): Effect.Effect<DeviceId, DeviceAlreadyRegisteredError | DeviceUnreachableError | TokenError> {
        // TODO: check token
        return Effect.Do.pipe(
            Effect.bind("device", () => this.deviceFactory.create(deviceUrl)),
            Effect.bind("_", ({ device }) => this.repo.add(device)),
            Effect.map(({ device }) => device.id),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "UniquenessConstraintViolatedError":
                    case "DuplicateIdError":
                        return DeviceAlreadyRegisteredError()
                    default:
                        return e
                }
            })
        )
    }
    remove(token: Token, deviceId: DeviceId): Effect.Effect<void, DeviceNotFoundError | TokenError> {
        // TODO: check token
        return pipe(
            this.repo.remove(deviceId),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                }
            })
        )
    }
    rename(token: Token, deviceId: DeviceId, name: string): Effect.Effect<void, DeviceNotFoundError | TokenError> {
        throw new Error("Method not implemented.");
    }
    find(token: Token, deviceId: DeviceId): Effect.Effect<Device, DeviceNotFoundError | InvalidTokenError> {
        // TODO: check token
        return pipe(
            this.repo.find(deviceId),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                }
            })
        )
    }
    getAllDevices(token: Token): Effect.Effect<Iterable<Device>, InvalidTokenError> {
        // TODO: check token
        return this.repo.getAll()
    }
    executeAction(token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError | InvalidTokenError | PermissionError> {
        throw new Error("Method not implemented.");
    }
    executeAutomationAction(deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError> {
        throw new Error("Method not implemented.");
    }
    updateDeviceProperty(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Effect.Effect<void, InvalidInputError | DeviceNotFoundError | DevicePropertyNotFound> {
        throw new Error("Method not implemented.");
    }
    subscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void {
        throw new Error("Method not implemented.");
    }
    unsubscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void {
        throw new Error("Method not implemented.");
    }
}