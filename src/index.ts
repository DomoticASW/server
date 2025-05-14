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
import { DeviceFactory } from "./ports/devices-management/DeviceFactory.js";
import { PermissionsService } from "./ports/permissions-management/PermissionsService.js";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus } from "./domain/devices-management/Device.js";
import { DeviceUnreachableError } from "./ports/devices-management/Errors.js";
import * as uuid from "uuid";
import { NoneInt } from "./domain/devices-management/Types.js";
import { DeviceEventsServiceImpl } from "./domain/devices-management/DeviceEventsServiceImpl.js";

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
// TODO: replace with production impl
const usersServiceMock: UsersService = {
    makeToken() { return Effect.succeed({ role: UserRole.Admin, userEmail: Email("a@email.com") }) },
    verifyToken() { return Effect.succeed(null) }
} as unknown as UsersService
// TODO: replace with production impl
const permissionsService: PermissionsService = {
    canExecuteActionOnDevice: () => Effect.succeed(undefined)
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

const deviceGroupRepository = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
const deviceRepository = new DeviceRepositoryMongoAdapter(mongoDBConnection)
const devicesService = new DevicesServiceImpl(deviceRepository, deviceFactory, usersServiceMock, permissionsService)
const deviceGroupsService = new DeviceGroupsServiceImpl(deviceGroupRepository, devicesService, usersServiceMock)
const deviceEventsService = new DeviceEventsServiceImpl(devicesService)
new HTTPServerAdapter(3000, deviceGroupsService, devicesService, deviceEventsService, usersServiceMock)
