import { Server } from "socket.io"
import { NotificationsService } from "../../../src/domain/notifications-management/NotificationsServiceImpl.js"
import { DevicesServiceSpy, DeviceStatusesServicespy, UsersServiceSpy } from "./mocks.js"

test("A notification service can be created", () => {
  const deviceStatusesService = DeviceStatusesServicespy()
  NotificationsService(deviceStatusesService.get(), new Server(), DevicesServiceSpy().get(), UsersServiceSpy().get())

  expect(deviceStatusesService.call()).toBe(1)
})