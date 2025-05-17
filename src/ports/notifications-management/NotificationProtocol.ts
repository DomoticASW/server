import { Email } from "../../domain/users-management/User.js";

export interface NotificationProtocol {
  sendNotification(email: Email, message: string): void
}