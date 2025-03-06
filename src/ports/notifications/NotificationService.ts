import { DeviceNotFoundError, InvalidTokenError, UserNotFoundError } from '../Errors.js'

export interface NotificationsService extends DeviceStatusChangesSubscriber {
  /**
   * Subscribes for device offline notifications.
   * @param token Authentication token
   * @param deviceId Identifier of the device
   * @returns Possible errors: DeviceNotFoundError | InvalidTokenError
   */
  subscribeForDeviceOfflineNotifications(
      token: Token,
      deviceId: DeviceId
  ): DeviceNotFoundError | InvalidTokenError | undefined;

  /**
   * Unsubscribes from device offline notifications.
   * @param token Authentication token
   * @param deviceId Identifier of the device
   * @returns Possible errors: DeviceNotFoundError | InvalidTokenError
   */
  unsubscribeForDeviceOfflineNotifications(
      token: Token,
      deviceId: DeviceId
  ): DeviceNotFoundError | InvalidTokenError | undefined;

  /**
   * Sends a notification to a user.
   * @param userId Identifier of the user
   * @param message Message to be sent
   * @returns Possible error: UserNotFoundError
   */
  sendNotification(
      userId: UserId,
      message: string
  ): UserNotFoundError | undefined;
}

type DeviceStatusChangesSubscriber = object

export type Token = string

export type UserId = string

export type DeviceId = string