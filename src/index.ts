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
// TODO: replace with production impl
const deviceCommunicationProtocol: DeviceCommunicationProtocol = new DeviceCommunicationProtocolHttpAdapter()

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
new HTTPServerAdapter(3000, deviceGroupsService, devicesService, deviceEventsService, usersServiceMock, notificationsService)
