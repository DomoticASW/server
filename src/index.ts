import mongoose from "mongoose";
import { HTTPServerAdapter } from "./adapters/http/HTTPServerAdapter.js";
import { DeviceGroupRepositoryMongoAdapter } from "./adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { UsersService } from "./ports/users-management/UserService.js";
import { Effect } from "effect";
import { UserRole } from "./domain/users-management/Token.js";
import { Email } from "./domain/users-management/User.js";
import { DeviceGroupsServiceImpl } from "./domain/devices-management/DeviceGroupsServiceImpl.js";
import { DeviceRepositoryMongoAdapter } from "./adapters/devices-management/DeviceRepositoryMongoAdapter.js";
import { DevicesServiceImpl } from "./domain/devices-management/DevicesServiceImpl.js";
import { PermissionsService } from "./ports/permissions-management/PermissionsService.js";
import { DeviceEventsServiceImpl } from "./domain/devices-management/DeviceEventsServiceImpl.js";
import { DeviceStatusChangesSubscriber, DeviceStatusesService } from "./ports/devices-management/DeviceStatusesService.js";
import { DeviceOfflineNotificationSubscriptionRepositoryMongoAdapter } from "./adapters/notifications-management/DeviceOfflineNotificationSubscription.js";
import { NotificationsService } from "./domain/notifications-management/NotificationsServiceImpl.js";
import { DeviceCommunicationProtocol } from "./ports/devices-management/DeviceCommunicationProtocol.js";
import { DeviceFactoryImpl } from "./domain/devices-management/DeviceFactoryImpl.js";
import { DeviceCommunicationProtocolHttpAdapter } from "./adapters/devices-management/DeviceCommunicationProtocolHttpAdapter.js";

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
const defaultServerPort = 3000
const serverPort = getServerPortFromEnv(defaultServerPort)
// TODO: replace with production impl
const usersServiceMock: UsersService = {
    makeToken() { return Effect.succeed({ role: UserRole.Admin, userEmail: Email("a@email.com") }) },
    verifyToken() { return Effect.succeed(null) },
    getUserDataUnsafe() { return Effect.succeed({}) }
} as unknown as UsersService
// TODO: replace with production impl
const permissionsService: PermissionsService = {
    canExecuteActionOnDevice: () => Effect.succeed(undefined)
} as unknown as PermissionsService

const deviceCommunicationProtocol: DeviceCommunicationProtocol = new DeviceCommunicationProtocolHttpAdapter(serverPort)

const deviceStatusesService: DeviceStatusesService = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscribeForDeviceStatusChanges: function (subscriber: DeviceStatusChangesSubscriber): void {

    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    unsubscribeForDeviceStatusChanges: function (subscriber: DeviceStatusChangesSubscriber): void {

    }
}

const deviceFactory = new DeviceFactoryImpl(deviceCommunicationProtocol)
const deviceGroupRepository = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
const deviceRepository = new DeviceRepositoryMongoAdapter(mongoDBConnection)
const deviceOfflineNotificationSubscriptionRepository = new DeviceOfflineNotificationSubscriptionRepositoryMongoAdapter(mongoDBConnection)
const devicesService = new DevicesServiceImpl(deviceRepository, deviceFactory, usersServiceMock, permissionsService, deviceCommunicationProtocol)
const deviceGroupsService = new DeviceGroupsServiceImpl(deviceGroupRepository, devicesService, usersServiceMock)
const deviceEventsService = new DeviceEventsServiceImpl(devicesService)
const notificationsService = NotificationsService(deviceStatusesService, devicesService, usersServiceMock, deviceOfflineNotificationSubscriptionRepository)
new HTTPServerAdapter(serverPort, deviceGroupsService, devicesService, deviceEventsService, usersServiceMock, notificationsService)

function getServerPortFromEnv(defaultServerPort: number): number {
    type EnvVarNotSet = "EnvVarNotSet"
    type InvalidEnvVar = "InvalidEnvVar"

    return Effect.Do.pipe(
        Effect.bind("serverPortStr", () => process.env.SERVER_PORT ? Effect.succeed(process.env.SERVER_PORT) : Effect.fail<EnvVarNotSet>("EnvVarNotSet")),
        Effect.bind("serverPortInt", ({ serverPortStr }) => {
            const portInt = Number.parseInt(serverPortStr)
            return !isNaN(portInt) ? Effect.succeed(portInt) : Effect.fail<InvalidEnvVar>("InvalidEnvVar")
        }),
        Effect.bind("_", ({ serverPortInt }) => serverPortInt >= 0 && serverPortInt <= 65535 ? Effect.void : Effect.fail<InvalidEnvVar>("InvalidEnvVar")),
        Effect.map(({ serverPortInt }) => serverPortInt),
        Effect.catchAll(err => {
            switch (err) {
                case "EnvVarNotSet":
                    console.log(`SERVER_PORT environment variable was not set, using default: ${defaultServerPort}`)
                    break
                case "InvalidEnvVar":
                    console.log(`SERVER_PORT=${process.env.SERVER_PORT} was not a valid port, using default: ${defaultServerPort}`)
                    break
            }
            return Effect.succeed(defaultServerPort)
        }),
        Effect.runSync
    )
}
