import mongoose from "mongoose";
import { HTTPServerAdapter } from "./adapters/http/HTTPServerAdapter.js";
import { DeviceGroupRepositoryMongoAdapter } from "./adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { UsersService } from "./ports/users-management/UsersService.js";
import { Effect } from "effect";
import { DeviceGroupsServiceImpl } from "./domain/devices-management/DeviceGroupsServiceImpl.js";
import { DeviceRepositoryMongoAdapter } from "./adapters/devices-management/DeviceRepositoryMongoAdapter.js";
import { DevicesServiceImpl } from "./domain/devices-management/DevicesServiceImpl.js";
import { PermissionsService } from "./ports/permissions-management/PermissionsService.js";
import { DeviceEventsServiceImpl } from "./domain/devices-management/DeviceEventsServiceImpl.js";
import { DeviceStatusesService } from "./ports/devices-management/DeviceStatusesService.js";
import { DeviceOfflineNotificationSubscriptionRepositoryMongoAdapter } from "./adapters/notifications-management/DeviceOfflineNotificationSubscription.js";
import { NotificationsService } from "./domain/notifications-management/NotificationsServiceImpl.js";
import { ScriptsServiceImpl } from "./domain/scripts-management/ScriptsServiceImpl.js";
import { ScriptRepositoryMongoAdapter } from "./adapters/scripts-management/ScriptRepositoryMongoAdapter.js";
import { DeviceCommunicationProtocol } from "./ports/devices-management/DeviceCommunicationProtocol.js";
import { DeviceFactoryImpl } from "./domain/devices-management/DeviceFactoryImpl.js";
import { DeviceCommunicationProtocolHttpAdapter } from "./adapters/devices-management/DeviceCommunicationProtocolHttpAdapter.js";
import { DeviceStatusesServiceImpl } from "./domain/devices-management/DeviceStatusesServiceImpl.js";
import { DeviceDiscovererUDPAdapter } from "./adapters/devices-management/DeviceDiscovererUDPAdapter.js";
import { UsersServiceImpl } from "./domain/users-management/UsersServiceImpl.js";
import { UserRepositoryAdapter } from "./adapters/users-management/UserRepositoryAdapter.js";
import { RegistrationRequestRepositoryAdapter } from "./adapters/users-management/RegistrationRequestRepositoryAdapter.js";

const isDev = parseBooleanEnvVar("DEV") ?? false

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
const serverPort = parsePortEnvVar("SERVER_PORT", 3000)
const userRepository = new UserRepositoryAdapter(mongoDBConnection)
const registrationRequestRepository = new RegistrationRequestRepositoryAdapter(mongoDBConnection)
let jwtSecret = parseEnvVar("JWT_SECRET")
// JWT secret must be specified in production environment
if (!jwtSecret || jwtSecret.trim() == "") {
    if (isDev) {
        jwtSecret = "secret"
        console.log(`Missing JWT_SECRET in development environment, using "${jwtSecret}" instead`)
    } else {
        console.error("Missing JWT_SECRET")
        process.exit(1)
    }
}
const usersService: UsersService = new UsersServiceImpl(userRepository, registrationRequestRepository, jwtSecret)
// TODO: replace with production impl
const permissionsService: PermissionsService = {
    canExecuteActionOnDevice: () => Effect.succeed(undefined),
    canExecuteTask: () => Effect.succeed(undefined),
    canEdit: () => Effect.succeed(undefined)
} as unknown as PermissionsService

const deviceCommunicationProtocol: DeviceCommunicationProtocol = new DeviceCommunicationProtocolHttpAdapter(serverPort)

const deviceFactory = new DeviceFactoryImpl(deviceCommunicationProtocol)
const deviceGroupRepository = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
const deviceRepository = new DeviceRepositoryMongoAdapter(mongoDBConnection)
const deviceOfflineNotificationSubscriptionRepository = new DeviceOfflineNotificationSubscriptionRepositoryMongoAdapter(mongoDBConnection)
const scriptRepository = new ScriptRepositoryMongoAdapter(mongoDBConnection)
const deviceDiscoverer = new DeviceDiscovererUDPAdapter(parsePortEnvVar("DISCOVERY_PORT", 30000), 5, { logAnnounces: parseBooleanEnvVar("LOG_ANNOUNCES") })
const devicesService = new DevicesServiceImpl(deviceRepository, deviceFactory, usersService, permissionsService, deviceCommunicationProtocol, deviceDiscoverer)
const logDeviceStatusChanges = parseBooleanEnvVar("LOG_DEVICE_STATUS_CHANGES") ?? false
const deviceStatusesService: DeviceStatusesService = new DeviceStatusesServiceImpl(5000, devicesService, deviceCommunicationProtocol, { logDeviceStatusChanges })
const deviceGroupsService = new DeviceGroupsServiceImpl(deviceGroupRepository, devicesService, usersService)
const deviceEventsService = new DeviceEventsServiceImpl(devicesService)
const notificationsService = NotificationsService(deviceStatusesService, devicesService, usersService, deviceOfflineNotificationSubscriptionRepository)
const scriptsService = new ScriptsServiceImpl(scriptRepository, devicesService, notificationsService, usersService, permissionsService, deviceEventsService)
const logRequestUrls = parseBooleanEnvVar("LOG_REQ_URLS") ?? false
const logRequestBodies = parseBooleanEnvVar("LOG_REQ_BODIES") ?? false
new HTTPServerAdapter("localhost", serverPort, deviceGroupsService, devicesService, deviceEventsService, usersService, notificationsService, scriptsService, { logRequestUrls, logRequestBodies })

function parseEnvVar(varName: string): string | undefined {
    return process.env[varName]
}
function parseBooleanEnvVar(varName: string): boolean | undefined {
    const str = process.env[varName]?.toLocaleLowerCase()
    if (str) {
        if (["true", "1", "yes", "on"].includes(str)) {
            return true
        } else if (["false", "0", "no", "off"].includes(str)) {
            return false
        } else {
            console.error(`Ignoring invalid value "${str}" for env var "${varName}"`)
        }
    }
    return undefined
}
function parsePortEnvVar(varName: string, defaultPort: number): number {
    type EnvVarNotSet = "EnvVarNotSet"
    type InvalidEnvVar = "InvalidEnvVar"

    return Effect.Do.pipe(
        Effect.bind("portStr", () => process.env[varName] ? Effect.succeed(process.env[varName]) : Effect.fail<EnvVarNotSet>("EnvVarNotSet")),
        Effect.bind("portInt", ({ portStr }) => {
            const portInt = Number.parseInt(portStr)
            return !isNaN(portInt) ? Effect.succeed(portInt) : Effect.fail<InvalidEnvVar>("InvalidEnvVar")
        }),
        Effect.bind("_", ({ portInt }) => portInt >= 0 && portInt <= 65535 ? Effect.void : Effect.fail<InvalidEnvVar>("InvalidEnvVar")),
        Effect.map(({ portInt }) => portInt),
        Effect.catchAll(err => {
            switch (err) {
                case "EnvVarNotSet":
                    console.log(`${varName} environment variable was not set, using default: ${defaultPort}`)
                    break
                case "InvalidEnvVar":
                    console.log(`${varName}=${process.env[varName]} was not a valid port, using default: ${defaultPort}`)
                    break
            }
            return Effect.succeed(defaultPort)
        }),
        Effect.runSync
    )
}
