import { HTTPServerAdapter } from "./adapters/HTTPServerAdapter.js";
import { NotificationsServiceImpl } from "./domain/notifications/NotificationService.js";


const notificationService = new NotificationsServiceImpl()
new HTTPServerAdapter(3000, notificationService)
