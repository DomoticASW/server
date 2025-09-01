import { Server as SocketIOServer, Socket } from "socket.io"
import { NotificationProtocol } from "../../ports/notifications-management/NotificationProtocol.js"
import { Email } from "../../domain/users-management/User.js"

export class NotificationProtocolSocketIOAdapter implements NotificationProtocol {
  private io: SocketIOServer

  constructor(server: SocketIOServer) {
    this.io = server
    this.setupSocketHandling()
  }

  private setupSocketHandling() {
    this.io.on("connection", (socket: Socket) => {
      socket.on("login", ({ email }: { email: Email }) => {
        socket.data.email = email
      })
    })
  }

  sendNotification(email: Email, message: string): void {
    const sockets = this.findSocketByEmail(email)
    sockets.forEach((s) => s.emit("notification", { message }))
  }

  private findSocketByEmail(email: Email): Socket[] {
    const sockets = this.io.sockets.sockets.values()
    const emailSockets: Socket[] = []
    for (const socket of sockets) {
      if (socket.data.email === email) {
        emailSockets.push(socket)
      }
    }
    return emailSockets
  }
}
