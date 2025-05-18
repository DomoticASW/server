import { runPromise } from "effect/Effect"
import { DeviceId } from "../../../src/domain/devices-management/Device.js"
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js"
import { NotificationsService } from "../../../src/domain/notifications-management/NotificationsServiceImpl.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { DeviceMock, DeviceOfflineNotificationSubscriptionRepositorySpy, DevicesServiceSpy, DeviceStatusesServiceSpy, NotificationProtocolSpy, RepoOperation, UserMock, UsersServiceSpy } from "../../utils/mocks.js"

const user = UserMock()
const device = DeviceMock()
let deviceStatusesServiceSpy = DeviceStatusesServiceSpy()
let devicesServiceSpy = DevicesServiceSpy(device, false)
let usersServiceSpy = UsersServiceSpy(user)
let subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.NONE, DeviceOfflineNotificationSubscription(Email("test"), DeviceId("testDevice")))

beforeEach(() => {
  deviceStatusesServiceSpy = DeviceStatusesServiceSpy()
  devicesServiceSpy = DevicesServiceSpy(device, false)
  usersServiceSpy = UsersServiceSpy(user)
  subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.NONE, DeviceOfflineNotificationSubscription(Email("test"), DeviceId("testDevice")))
})

test("A notifications service can be created", () => {
  NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())
  expect(deviceStatusesServiceSpy.call()).toBe(1)
})

test("A user can subscribe to notifications service to listen for offline devices", async () => {
  const email = user.email
  const deviceId = device.id
  const subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.ADD, DeviceOfflineNotificationSubscription(email, deviceId))
  const notificationsService = NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())

  await runPromise(notificationsService.subscribeForDeviceOfflineNotifications(email, deviceId))

  expect(devicesServiceSpy.call()).toBe(1)
  expect(usersServiceSpy.call()).toBe(1)
  expect(subscriptionRepositorySpy.call()).toBe(1)
})

test("A user can unsubscribe from a notifications service to stop listening for offline devices", async () => {
  const email = user.email
  const deviceId = device.id
  const subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.REMOVE, DeviceOfflineNotificationSubscription(email, deviceId))
  const notificationsService = NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())

  await runPromise(notificationsService.unsubscribeForDeviceOfflineNotifications(email, deviceId))

  expect(devicesServiceSpy.call()).toBe(1)
  expect(usersServiceSpy.call()).toBe(1)
  expect(subscriptionRepositorySpy.call()).toBe(1)
})

test("A user can send a notification if notification protocol has beed set", async () => {
  const notificationProtocolSpy = NotificationProtocolSpy()
  const notificationsService = NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())
  
  notificationsService.setupNotificationProtocol(notificationProtocolSpy.get())
  
  await runPromise(notificationsService.sendNotification(user.email, "test"))
  
  expect(notificationProtocolSpy.call()).toBe(1)
  expect(usersServiceSpy.call()).toBe(1)
})