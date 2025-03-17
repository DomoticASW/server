import { Result } from 'option-t/plain_result';
import { InvalidTokenError, UserNotFoundError } from '../users-management/Errors.js';
import { DeviceNotFoundError } from '../devices-management/Errors.js';

export interface NotificationsService extends DeviceStatusChangesSubscriber {
  subscribeForDeviceOfflineNotifications(
      token: Token,
      deviceId: DeviceId
  ): Result<undefined, DeviceNotFoundError | InvalidTokenError>

  unsubscribeForDeviceOfflineNotifications(
      token: Token,
      deviceId: DeviceId
  ): Result<undefined, DeviceNotFoundError | InvalidTokenError>

  sendNotification(
      userId: UserId,
      message: string
  ): Result<undefined, UserNotFoundError>
}

type DeviceStatusChangesSubscriber = object

export type Token = string

export type UserId = string

export type DeviceId = string