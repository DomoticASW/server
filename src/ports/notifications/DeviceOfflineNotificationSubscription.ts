import { Email, DeviceId } from "./NotificationService.js";

export interface DeviceOfflineNotificationSubscription {
  readonly email: Email;
  readonly deviceId: DeviceId;
}
