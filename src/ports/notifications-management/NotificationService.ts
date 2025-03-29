import { InvalidTokenError, UserNotFoundError } from '../users-management/Errors.js';
import { DeviceNotFoundError } from '../devices-management/Errors.js';
import { DeviceId } from '../../domain/devices-management/Device.js';
import { DeviceStatusChangesSubscriber } from '../devices-management/DeviceStatusesService.js';
import { Token } from "../../domain/users-management/Token.js";
import { Email } from '../../domain/users-management/User.js';
import { Effect } from 'effect/Effect';

export interface NotificationsService extends DeviceStatusChangesSubscriber {
    subscribeForDeviceOfflineNotifications(
        token: Token,
        deviceId: DeviceId
    ): Effect<void, DeviceNotFoundError | InvalidTokenError>

    unsubscribeForDeviceOfflineNotifications(
        token: Token,
        deviceId: DeviceId
    ): Effect<void, DeviceNotFoundError | InvalidTokenError>

    sendNotification(
        email: Email,
        message: string
    ): Effect<void, UserNotFoundError>
}
