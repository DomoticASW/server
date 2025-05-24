import mongoose from "mongoose";
import { HTTPServerAdapter } from "./adapters/http/HTTPServerAdapter.js";
import { DeviceGroupRepositoryMongoAdapter } from "./adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";
import { UsersService } from "./ports/users-management/UsersService.js";
import { Effect } from "effect";
import { Email, Role } from "./domain/users-management/User.js";
import { DeviceGroupsServiceImpl } from "./domain/devices-management/DeviceGroupsServiceImpl.js";
import { DeviceRepositoryMongoAdapter } from "./adapters/devices-management/DeviceRepositoryMongoAdapter.js";
import { DevicesServiceImpl } from "./domain/devices-management/DevicesServiceImpl.js";
import { DeviceFactory } from "./ports/devices-management/DeviceFactory.js";
import { PermissionsService } from "./ports/permissions-management/PermissionsService.js";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus } from "./domain/devices-management/Device.js";
import { DeviceUnreachableError } from "./ports/devices-management/Errors.js";
import * as uuid from "uuid";
import { NoneInt } from "./domain/devices-management/Types.js";
import { DeviceEventsServiceImpl } from "./domain/devices-management/DeviceEventsServiceImpl.js";
import { DeviceStatusChangesSubscriber, DeviceStatusesService } from "./ports/devices-management/DeviceStatusesService.js";
import { DeviceOfflineNotificationSubscriptionRepositoryMongoAdapter } from "./adapters/notifications-management/DeviceOfflineNotificationSubscription.js";
import { NotificationsService } from "./domain/notifications-management/NotificationsServiceImpl.js";
import { ScriptsServiceImpl } from "./domain/scripts-management/ScriptsServiceImpl.js";
import { ScriptRepositoryMongoAdapter } from "./adapters/scripts-management/ScriptRepositoryMongoAdapter.js";

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
// TODO: replace with production impl
const usersServiceMock: UsersService = {
    makeToken() { return Effect.succeed({ role: Role.Admin, userEmail: Email("a@email.com") }) },
    verifyToken() { return Effect.succeed(null) },
    getUserDataUnsafe() { return Effect.succeed({  }) }
} as unknown as UsersService
// TODO: replace with production impl
const permissionsService: PermissionsService = {
    canExecuteActionOnDevice: () => Effect.succeed(undefined),
    canExecuteTask: () => Effect.succeed(undefined),
    canEdit: () => Effect.succeed(undefined)
} as unknown as PermissionsService
// TODO: replace with production impl
const deviceFactory: DeviceFactory = {
    create: function (deviceUrl: URL): Effect.Effect<Device, DeviceUnreachableError> {
        const action = DeviceAction(DeviceActionId("1"), "Action", NoneInt())
        const property = DeviceProperty(DevicePropertyId("1"), "Name", 3, NoneInt())
        const event1 = DeviceEvent("event1")
        const event2 = DeviceEvent("event2")
        return Effect.succeed(Device(DeviceId(uuid.v4()), deviceUrl.hostname, deviceUrl, DeviceStatus.Online, [property], [action], [event1, event2]))
    }
}

const deviceStatusesService: DeviceStatusesService = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscribeForDeviceStatusChanges: function (subscriber: DeviceStatusChangesSubscriber): void {
        
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    unsubscribeForDeviceStatusChanges: function (subscriber: DeviceStatusChangesSubscriber): void {
        
    }
}

const deviceGroupRepository = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
const deviceRepository = new DeviceRepositoryMongoAdapter(mongoDBConnection)
const deviceOfflineNotificationSubscriptionRepository = new DeviceOfflineNotificationSubscriptionRepositoryMongoAdapter(mongoDBConnection)
const scriptRepository = new ScriptRepositoryMongoAdapter(mongoDBConnection)
const devicesService = new DevicesServiceImpl(deviceRepository, deviceFactory, usersServiceMock, permissionsService)
const deviceGroupsService = new DeviceGroupsServiceImpl(deviceGroupRepository, devicesService, usersServiceMock)
const deviceEventsService = new DeviceEventsServiceImpl(devicesService)
const notificationsService = NotificationsService(deviceStatusesService, devicesService, usersServiceMock, deviceOfflineNotificationSubscriptionRepository)
const scriptsService = new ScriptsServiceImpl(scriptRepository, devicesService, notificationsService, usersServiceMock, permissionsService, deviceEventsService)
new HTTPServerAdapter(3000, deviceGroupsService, devicesService, deviceEventsService, usersServiceMock, notificationsService, scriptsService)
