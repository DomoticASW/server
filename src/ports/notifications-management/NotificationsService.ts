import { UserNotFoundError } from '../users-management/Errors.js';
import { DeviceNotFoundError } from '../devices-management/Errors.js';
import { DeviceId } from '../../domain/devices-management/Device.js';
import { DeviceStatusChangesSubscriber } from '../devices-management/DeviceStatusesService.js';
import { Email } from '../../domain/users-management/User.js';
import { Effect } from 'effect/Effect';
import { NotificationProtocol } from './NotificationProtocol.js';

export interface NotificationsService extends DeviceStatusChangesSubscriber {
    subscribeForDeviceOfflineNotifications(
        email: Email,
        deviceId: DeviceId
    ): Effect<void, DeviceNotFoundError | UserNotFoundError>

    unsubscribeForDeviceOfflineNotifications(
        email: Email,
        deviceId: DeviceId
    ): Effect<void, DeviceNotFoundError | UserNotFoundError>

    sendNotification(
        email: Email,
        message: string
    ): Effect<void, UserNotFoundError>

    setupNotificationProtocol(notificationProtocol: NotificationProtocol): void
}
