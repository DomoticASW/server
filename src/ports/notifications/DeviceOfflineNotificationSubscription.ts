import { UserId, DeviceId } from "./NotificationService.js";

export interface DeviceOfflineNotificationSubscription {
  userId: UserId;
  deviceId: DeviceId;
}
