import { DeviceId } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";

export interface DeviceOfflineNotificationSubscription {
  readonly email: Email;
  readonly deviceId: DeviceId;
}

export function DeviceOfflineNotificationSubscription(email: string, deviceId: string): DeviceOfflineNotificationSubscription {
  return {
    email: Email(email),
    deviceId: DeviceId(deviceId)
  }
}