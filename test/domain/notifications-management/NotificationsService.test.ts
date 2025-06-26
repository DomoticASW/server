import { runPromise } from "effect/Effect"
import { DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js"
import { NotificationsService } from "../../../src/domain/notifications-management/NotificationsServiceImpl.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { DeviceMock, DeviceOfflineNotificationSubscriptionRepositorySpy, DevicesServiceSpy, DeviceStatusesServiceSpy, NotificationProtocolSpy, RepoOperation, TokenMock, UserMock, UsersServiceSpy } from "../../utils/mocks.js"

const token = TokenMock("test")
const user = UserMock(token.userEmail)
const device = DeviceMock()
const deviceId = device.id
let deviceStatusesServiceSpy = DeviceStatusesServiceSpy()
let devicesServiceSpy = DevicesServiceSpy(device, false)
let usersServiceSpy = UsersServiceSpy(user, token)
let subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.NONE, DeviceOfflineNotificationSubscription(Email("test"), DeviceId("testDevice")))

beforeEach(() => {
  deviceStatusesServiceSpy = DeviceStatusesServiceSpy()
  devicesServiceSpy = DevicesServiceSpy(device, false)
  usersServiceSpy = UsersServiceSpy(user, token)
  subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.NONE, DeviceOfflineNotificationSubscription(Email("test"), DeviceId("testDevice")))
})

test("A notifications service can be created", () => {
  NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())
  expect(deviceStatusesServiceSpy.call()).toBe(1)
})

test("A user can subscribe to notifications service to listen for offline devices", async () => {
  const subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.ADD, DeviceOfflineNotificationSubscription(token.userEmail, deviceId))
  const notificationsService = NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())

  await runPromise(notificationsService.subscribeForDeviceOfflineNotifications(token, deviceId))

  expect(devicesServiceSpy.call()).toBe(1)
  expect(usersServiceSpy.call()).toBe(2)
  expect(subscriptionRepositorySpy.call()).toBe(1)
})

test("A user can unsubscribe from a notifications service to stop listening for offline devices", async () => {
  const subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.REMOVE, DeviceOfflineNotificationSubscription(token.userEmail, deviceId))
  const notificationsService = NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())
  
  await runPromise(notificationsService.unsubscribeForDeviceOfflineNotifications(token, deviceId))
  
  expect(devicesServiceSpy.call()).toBe(1)
  expect(usersServiceSpy.call()).toBe(2)
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

test("A notifications Service sends a notification to subscribers when a device is offline", async () => {
  const email = user.email
  const deviceId = device.id
  const subscriptionRepositorySpy = DeviceOfflineNotificationSubscriptionRepositorySpy(RepoOperation.GETALL, DeviceOfflineNotificationSubscription(email, deviceId))
  const notificationProtocolSpy = NotificationProtocolSpy()

  const notificationsService = NotificationsService(deviceStatusesServiceSpy.get(), devicesServiceSpy.get(), usersServiceSpy.get(), subscriptionRepositorySpy.get())
  notificationsService.setupNotificationProtocol(notificationProtocolSpy.get())

  await(runPromise(notificationsService.deviceStatusChanged(deviceId, DeviceStatus.Offline)))

  expect(subscriptionRepositorySpy.call()).toBe(1)
  expect(notificationProtocolSpy.call()).toBe(1)
  expect(usersServiceSpy.call()).toBe(1)
  expect(devicesServiceSpy.call()).toBe(1)
})