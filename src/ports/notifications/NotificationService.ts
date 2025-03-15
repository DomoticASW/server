import { DeviceNotFoundError, InvalidTokenError, UserNotFoundError } from '../Errors.js'

export interface NotificationsService extends DeviceStatusChangesSubscriber {
  subscribeForDeviceOfflineNotifications(
      token: Token,
      deviceId: DeviceId
  ): DeviceNotFoundError | InvalidTokenError | undefined;

  unsubscribeForDeviceOfflineNotifications(
      token: Token,
      deviceId: DeviceId
  ): DeviceNotFoundError | InvalidTokenError | undefined;

  sendNotification(
      userId: UserId,
      message: string
  ): UserNotFoundError | undefined;
}

type DeviceStatusChangesSubscriber = object

export type Token = string

export type UserId = string

export type DeviceId = string