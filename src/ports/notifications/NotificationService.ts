import { Result } from 'option-t/plain_result';
import { DeviceNotFoundError, InvalidTokenError, UserNotFoundError } from '../Errors.js'

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
      email: Email,
      message: string
  ): Result<undefined, UserNotFoundError>
}

type DeviceStatusChangesSubscriber = object

export type Token = string

export type Email = string

export type DeviceId = string