import { InvalidTokenError, UserNotFoundError } from "../users-management/Errors.js"
import { DeviceNotFoundError } from "../devices-management/Errors.js"
import { DeviceId } from "../../domain/devices-management/Device.js"
import { DeviceStatusChangesSubscriber } from "../devices-management/DeviceStatusesService.js"
import { Email } from "../../domain/users-management/User.js"
import { Effect } from "effect/Effect"
import { NotificationProtocol } from "./NotificationProtocol.js"
import { Token } from "../../domain/users-management/Token.js"

export interface NotificationsService extends DeviceStatusChangesSubscriber {
  subscribeForDeviceOfflineNotifications(
    token: Token,
    deviceId: DeviceId
  ): Effect<void, DeviceNotFoundError | UserNotFoundError | InvalidTokenError>

  unsubscribeForDeviceOfflineNotifications(
    token: Token,
    deviceId: DeviceId
  ): Effect<void, DeviceNotFoundError | UserNotFoundError | InvalidTokenError>

  isSubscribedForDeviceOfflineNotifications(
    token: Token,
    deviceId: DeviceId
  ): Effect<boolean, DeviceNotFoundError | UserNotFoundError | InvalidTokenError>

  sendNotification(email: Email, message: string): Effect<void, UserNotFoundError>

  setupNotificationProtocol(notificationProtocol: NotificationProtocol): void
}
