import { DeviceId } from "../../../src/domain/devices-management/Device.js";
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Email } from "../../../src/domain/users-management/User.js";

test("A DeviceOfflineNotificationSubscription can be created", () => {
  const notification = DeviceOfflineNotificationSubscription(Email("email"), DeviceId("id"));
  expect(notification.deviceId).toBe(DeviceId("id"));
  expect(notification.email).toBe(Email("email"));
});