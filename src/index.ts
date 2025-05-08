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

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
// TODO: replace with production impl
const usersServiceMock: UsersService = {
    makeToken() { return Effect.succeed({ role: UserRole.Admin, userEmail: Email("a@email.com") }) },
    verifyToken() { return Effect.succeed(null) }
} as unknown as UsersService
// TODO: replace with production impl
const permissionsService = null as unknown as PermissionsService
// TODO: replace with production impl
const deviceFactory = null as unknown as DeviceFactory

const deviceGroupRepository = new DeviceGroupRepositoryMongoAdapter(mongoDBConnection)
const deviceRepository = new DeviceRepositoryMongoAdapter(mongoDBConnection)
const devicesService = new DevicesServiceImpl(deviceRepository, deviceFactory, usersServiceMock, permissionsService)
const deviceGroupsService = new DeviceGroupsServiceImpl(deviceGroupRepository, devicesService, usersServiceMock)
new HTTPServerAdapter(3000, deviceGroupsService, usersServiceMock)
