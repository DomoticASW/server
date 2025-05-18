import { DeviceId } from "../../../src/domain/devices-management/Device.js"
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js"
import { NotificationsService } from "../../../src/domain/notifications-management/NotificationsServiceImpl.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { DeviceOfflineNotificationSubscriptionRepositorySpy, DevicesServiceSpy, DeviceStatusesServiceSpy, RepoOperation, UsersServiceSpy } from "../../utils/mocks.js"

test("A notifications service can be created", () => {
  const deviceStatusesServiceSpy = DeviceStatusesServiceSpy()
  NotificationsService(deviceStatusesServiceSpy.get(), DevicesServiceSpy().get(), UsersServiceSpy().get(), DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.NONE, DeviceOfflineNotificationSubscription(Email("test"), DeviceId("testDevice"))).get())
  expect(deviceStatusesServiceSpy.call()).toBe(1)
})

test("A user can subscribe to notifications service to listen for offline devices", async () => {
  
})