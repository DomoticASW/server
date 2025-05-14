/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect } from "effect/Effect";
import { DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { InvalidTokenError, UserNotFoundError } from "../../ports/users-management/Errors.js";
import { DeviceId, DeviceStatus } from "../devices-management/Device.js";
import { Token } from "../users-management/Token.js";
import { Email } from "../users-management/User.js";
import { DeviceStatusesService } from "../../ports/devices-management/DeviceStatusesService.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { Server, Socket } from "socket.io"
import { UsersService } from "../../ports/users-management/UserService.js";

class NotificationsServiceImpl implements NotificationsService {
  constructor(private deviceStatusesService: DeviceStatusesService, private io: Server, private devicesService: DevicesService, private usersService: UsersService) {
    deviceStatusesService.subscribeForDeviceStatusChanges(this)
  }

  subscribeForDeviceOfflineNotifications(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
    throw new Error("Method not implemented.");
  }
  unsubscribeForDeviceOfflineNotifications(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
    throw new Error("Method not implemented.");
  }
  sendNotification(email: Email, message: string): Effect<void, UserNotFoundError> {
    throw new Error("Method not implemented.");
  }
  deviceStatusChanged(deviceId: DeviceId, status: DeviceStatus): void {
    throw new Error("Method not implemented.");
  }
}

export function NotificationsService(deviceStatusesService: DeviceStatusesService, io: Server, devicesService: DevicesService, usersService: UsersService) : NotificationsService {
  return new NotificationsServiceImpl(deviceStatusesService, io, devicesService, usersService)
}