/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotificationsService } from "../../ports/notifications/NotificationService.js";

export class NotificationsServiceImpl implements NotificationsService {
    subscribeForDeviceOfflineNotifications(
        token: string,
        deviceId: string
    ): DeviceNotFoundError | InvalidTokenError | null {
        return null;
    }

    unsubscribeForDeviceOfflineNotifications(
        token: string,
        deviceId: string
    ): DeviceNotFoundError | InvalidTokenError | null {
        return null;
    }

    sendNotification(
        userId: string,
        message: string
    ): UserNotFoundError | null {
        return new UserNotFoundError();
    }
}

export class DeviceNotFoundError extends Error { }
export class InvalidTokenError extends Error { }
export class UserNotFoundError extends Error {
    message: string = "User not found"
}

