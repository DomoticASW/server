import { Effect, pipe } from "effect";
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../ports/devices-management/DevicesService.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DevicePropertyNotFound, DeviceAlreadyRegisteredError } from "../../ports/devices-management/Errors.js";
import { PermissionError } from "../../ports/permissions-management/Errors.js";
import { TokenError, InvalidTokenError, UnauthorizedError } from "../../ports/users-management/Errors.js";
import { Token, UserRole } from "../users-management/Token.js";
import { DeviceId, Device, DeviceActionId, DevicePropertyId, DeviceAddress } from "./Device.js";
import { DeviceFactory } from "../../ports/devices-management/DeviceFactory.js";
import { DeviceRepository } from "../../ports/devices-management/DeviceRepository.js";
import { UsersService } from "../../ports/users-management/UserService.js";
import { PermissionsService } from "../../ports/permissions-management/PermissionsService.js";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";

export class DevicesServiceImpl implements DevicesService {
    private propertyUpdatesSubscribers: DevicePropertyUpdatesSubscriber[] = [];
    constructor(
        private repo: DeviceRepository,
        private deviceFactory: DeviceFactory,
        private usersService: UsersService,
        private permissionsService: PermissionsService,
        private deviceCommunicationProtocol: DeviceCommunicationProtocol) {
    }

    add(token: Token, deviceAddress: DeviceAddress): Effect.Effect<DeviceId, DeviceAlreadyRegisteredError | DeviceUnreachableError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("_", () =>
                Effect.if(token.role == UserRole.Admin, {
                    onTrue: () => this.usersService.verifyToken(token),
                    onFalse: () => Effect.fail(UnauthorizedError())
                })),
            Effect.bind("device", () => this.deviceFactory.create(deviceAddress)),
            Effect.bind("__", ({ device }) => this.repo.add(device)),
            Effect.map(({ device }) => device.id),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "DuplicateIdError":
                        return DeviceAlreadyRegisteredError()
                    default:
                        return e
                }
            })
        )
    }
    remove(token: Token, deviceId: DeviceId): Effect.Effect<void, DeviceNotFoundError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("_", () =>
                Effect.if(token.role == UserRole.Admin, {
                    onTrue: () => this.usersService.verifyToken(token),
                    onFalse: () => Effect.fail(UnauthorizedError())
                })),
            Effect.bind("__", () => this.repo.remove(deviceId)),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.asVoid
        )
    }
    rename(token: Token, deviceId: DeviceId, name: string): Effect.Effect<void, DeviceNotFoundError | TokenError> {
        return Effect.Do.pipe(
            Effect.bind("_", () =>
                Effect.if(token.role == UserRole.Admin, {
                    onTrue: () => this.usersService.verifyToken(token),
                    onFalse: () => Effect.fail(UnauthorizedError())
                })),
            Effect.bind("device", () => this.find(token, deviceId)),
            Effect.bind("__", ({ device }) => {
                device.name = name
                return this.repo.update(device)
            }),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.asVoid
        )
    }
    find(token: Token, deviceId: DeviceId): Effect.Effect<Device, DeviceNotFoundError | InvalidTokenError> {
        return Effect.Do.pipe(
            Effect.bind("_", () => this.usersService.verifyToken(token)),
            Effect.bind("device", () => this.findUnsafe(deviceId)),
            Effect.map((({ device }) => device))
        )
    }
    /**
     * This function is not expected to be exposed and should only used internally
     */
    findUnsafe(deviceId: DeviceId): Effect.Effect<Device, DeviceNotFoundError> {
        return Effect.Do.pipe(
            Effect.bind("device", () => this.repo.find(deviceId)),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                }
            }),
            Effect.map(({ device }) => device)
        )
    }
    getAllDevices(token: Token): Effect.Effect<Iterable<Device>, InvalidTokenError> {
        return pipe(
            this.usersService.verifyToken(token),
            Effect.flatMap(() => this.getAllDevicesUnsafe())
        )
    }
    /**
     * This function is not expected to be exposed and should only used internally
     */
    getAllDevicesUnsafe(): Effect.Effect<Iterable<Device>, never> {
        return this.repo.getAll()
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
            Effect.bind("device", () => this.findUnsafe(deviceId)),
            Effect.bind("_", ({ device }) => device.executeAction(actionId, input, this.deviceCommunicationProtocol))
        )
    }

    /**
     * This function is expected to be called by a device to inform
     * the server about the fact that one of its properties has updated
     * its value.
     * As a result no type error is expected to be thrown as devices
     * should correctly know their property types and constraints
     */
    updateDeviceProperty(deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Effect.Effect<void, DeviceNotFoundError | DevicePropertyNotFound> {
        return Effect.Do.pipe(
            Effect.bind("device", () => this.repo.find(deviceId)),
            Effect.bind("property", ({ device }) => {
                const property = device.properties.find(p => p.id === propertyId)
                if (property) return Effect.succeed(property)
                else return Effect.fail(DevicePropertyNotFound(`Device ${device.name} does not have a property with id: ${propertyId}`))
            }),
            Effect.bind("_", ({ device, property }) => {
                property.value = value
                return this.repo.update(device)
            }),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.tap(({ device, property }) => this.propertyUpdatesSubscribers.forEach(s => s.devicePropertyChanged(device.id, property.id, value))),
            Effect.asVoid
        )
    }
    updateDeviceProperties(deviceId: DeviceId, properties: Map<DevicePropertyId, unknown>): Effect.Effect<void, DeviceNotFoundError | DevicePropertyNotFound> {
        return Effect.Do.pipe(
            Effect.bind("device", () => this.repo.find(deviceId)),
            Effect.bind("_", ({ device }) => {
                // Checking that all properties exist
                const notFoundProperties = Array.from(properties.keys()).flatMap(id => device.properties.find(p => p.id === id) ? [] : [id])
                if (notFoundProperties.length > 0) { return Effect.fail(DevicePropertyNotFound(notFoundProperties.join(", "))) }
                else { return Effect.void }
            }),
            Effect.let("oldProperties", ({ device }) => {
                return device.properties.map(p => [p.id, p.value] as [DevicePropertyId, unknown])
            }),
            Effect.bind("__", ({ device }) => {
                properties.forEach((value, id) =>
                    device.properties.find(p => p.id === id)!.value = value
                )
                return this.repo.update(device)
            }),
            Effect.mapError((e) => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return DeviceNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
            Effect.map(({ oldProperties }) => {
                const updatedProperties = Array.from(properties).filter(pair => oldProperties.find(p => p[0] === pair[0])![1] != pair[1])
                this.propertyUpdatesSubscribers.forEach(s => {
                    updatedProperties.forEach(pair => {
                        s.devicePropertyChanged(deviceId, pair[0], pair[1])
                    })
                })
            })
        )
    }
    subscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void {
        this.propertyUpdatesSubscribers.push(subscriber)
    }
    unsubscribeForDevicePropertyUpdates(subscriber: DevicePropertyUpdatesSubscriber): void {
        this.propertyUpdatesSubscribers = this.propertyUpdatesSubscribers.filter(s => s !== subscriber)
    }
}