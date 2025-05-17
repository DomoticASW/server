import { Server } from 'node:http';
import { Server as IO, Socket } from 'socket.io';
import { NotificationProtocol } from '../../../ports/notifications-management/NotificationProtocol.js';
import { Email } from '../../../domain/users-management/User.js';

export class NotificationProtocolImpl implements NotificationProtocol {
  private io: IO

  constructor (server: Server) {
    this.io = new IO(server)
  }

  sendNotification(email: Email, message: string): void {
    if (this.findSocketByEmail(email)) {
      this.io.emit("notification", { message })
    }
  }

  private findSocketByEmail(email: Email): Socket | undefined {
    const sockets = this.io.sockets.sockets.values()
    for (const socket of sockets) {
      if (socket.data.email === email) {
        return socket
      }
    }
  }

  setup(): void {
    throw new Error('Method not implemented.');
  }
}