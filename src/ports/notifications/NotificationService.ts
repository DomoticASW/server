import { Result } from 'option-t/plain_result';
import { InvalidTokenError, UserNotFoundError } from '../users-management/Errors.js';
import { DeviceNotFoundError } from '../devices-management/Errors.js';
import { DeviceId } from '../../domain/devices-management/Device.js';
import { DeviceStatusChangesSubscriber } from '../devices-management/DeviceStatusesService.js';
import { Token } from "../users-management/Token.js";
import { Email } from '../users-management/User.js';

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
