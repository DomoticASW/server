import { UserId, DeviceId } from "./NotificationService.js";

export interface DeviceOfflineNotificationSubscription {
  readonly userId: UserId;
  readonly deviceId: DeviceId;
}
