import { DeviceId } from "../../domain/devices-management/Device.js";
import { Email } from "../../domain/users-management/User.js";

export interface DeviceOfflineNotificationSubscription {
  readonly email: Email;
  readonly deviceId: DeviceId;
}
