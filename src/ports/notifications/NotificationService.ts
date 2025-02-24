export interface NotificationsService {
    subscribeForDeviceOfflineNotifications(
        token: string,
        deviceId: string
    ): DeviceNotFoundError | InvalidTokenError | null;

    unsubscribeForDeviceOfflineNotifications(
        token: string,
        deviceId: string
    ): DeviceNotFoundError | InvalidTokenError | null;

    sendNotification(
        userId: string,
        message: string
    ): UserNotFoundError | null;
}

export class DeviceNotFoundError extends Error { }
export class InvalidTokenError extends Error { }
export class UserNotFoundError extends Error { }

