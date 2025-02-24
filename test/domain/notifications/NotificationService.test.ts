import { NotificationsServiceImpl } from "../../../src/domain/notifications/NotificationService.js";

test('adds 1 + 2 to equal 3', () => {
    const impl = new NotificationsServiceImpl()
    expect(impl.sendNotification("", "")).toBe(null)
});
