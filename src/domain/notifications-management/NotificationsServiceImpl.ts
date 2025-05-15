/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, map, mapError, runPromise, fail, succeed, flatMap, bind, Do } from "effect/Effect";
import { DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { InvalidTokenError, UserNotFoundError } from "../../ports/users-management/Errors.js";
import { DeviceId, DeviceStatus } from "../devices-management/Device.js";
import { Token } from "../users-management/Token.js";
import { Email } from "../users-management/User.js";
import { DeviceStatusesService } from "../../ports/devices-management/DeviceStatusesService.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { Server, Socket } from "socket.io"
import { UsersService } from "../../ports/users-management/UserService.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { pipe } from "effect";
import { DeviceOfflineNotificationSubscription } from "./DeviceOfflineNotificationSubscription.js";
import { InvalidTokenErrorMock } from "../../../test/domain/notifications-management/mocks.js";
import { UserNotFoundErrorMock } from "../../../test/domain/scripts-management/mocks.js";

class NotificationsServiceImpl implements NotificationsService {
  private deviceSubscriptions: Map<DeviceId, Map<Email, Socket>> = new Map()

  constructor(private deviceStatusesService: DeviceStatusesService, private io: Server, private devicesService: DevicesService, private usersService: UsersService, private subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) {
    deviceStatusesService.subscribeForDeviceStatusChanges(this)
    this.setupSocketHandling()
  }

  private setupSocketHandling() {
    this.io.on("connection", (socket: Socket) => {
      socket.on("register", async ({ token }: { token: Token }) => {
        await runPromise(pipe(
          this.usersService.verifyToken(token),
          map(() => socket.data.email = token.userEmail),
          map(() => pipe(
            this.subscriptionsRepository.getAll(),
            map(subscriptions => {
              for (const sub of subscriptions) {
                if (sub.email === token.userEmail) {
                  if (!this.deviceSubscriptions.has(sub.deviceId)) {
                    this.deviceSubscriptions.set(sub.deviceId, new Map())
                  }
                  this.deviceSubscriptions.get(sub.deviceId)!.set(token.userEmail, socket)
                }
              }
              succeed(undefined)
            })
          )),
          mapError(err => socket.emit(err.__brand, err.message + ": " + err.cause))
        ))
      })

      socket.on("disconnect", () => {
        const email = socket.data?.email
        if (email) {
          this.cleanupSocket(email, socket)
        }
      })
    }) 
  }

  private cleanupSocket(email: Email, socket: Socket) {
    for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
      if (subscribers.get(email) === socket) {
        subscribers.delete(email);
        if (subscribers.size === 0) {
          this.deviceSubscriptions.delete(deviceId);
        }
      }
    }
  }

  subscribeForDeviceOfflineNotifications(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
    return pipe(
      this.findSocketByEmail(token.userEmail),
      flatMap(socket => pipe(
        this.devicesService.find(token, deviceId),
        map(() => {
          if (!this.deviceSubscriptions.has(deviceId)) {
            this.deviceSubscriptions.set(deviceId, new Map());
          }
          this.deviceSubscriptions.get(deviceId)!.set(token.userEmail, socket);
          return succeed(undefined)
        }),
        map(() => this.subscriptionsRepository.add(DeviceOfflineNotificationSubscription(token.userEmail, deviceId))),
      ))
    )
  }

  unsubscribeForDeviceOfflineNotifications(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
    throw new Error("Method not implemented.");
  }

  sendNotification(email: Email, message: string): Effect<void, UserNotFoundError> {
    return pipe(
      this.findSocketByEmail(email),
      flatMap(socket => {
        socket.emit("notification", { message })
        return succeed(undefined)
      }),
      mapError(err => UserNotFoundErrorMock(err.cause)) // Add real user Not found error 
    )
  }

  deviceStatusChanged(deviceId: DeviceId, deviceName: string, status: DeviceStatus): void {
    if (status === DeviceStatus.Offline) {
      console.log("Status changed:", status)
      const subscribers = this.deviceSubscriptions.get(deviceId);
      if (subscribers) {
        for (const [_, socket] of subscribers.entries()) {
          socket.emit("notification", {
            message: `Device ${deviceName} went offline.`,
          });
        }
      }
    }
  }

  private findSocketByEmail(email: Email): Effect<Socket, InvalidTokenError> {
    const sockets = this.io.sockets.sockets.values()
    for (const socket of sockets) {
      if (socket.data.email === email) {
        return succeed(socket)
      }
    }

    return fail(InvalidTokenErrorMock()) //Add real InvalidTokenError
  }
}

export function NotificationsService(deviceStatusesService: DeviceStatusesService, io: Server, devicesService: DevicesService, usersService: UsersService, subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) : NotificationsService {
  return new NotificationsServiceImpl(deviceStatusesService, io, devicesService, usersService, subscriptionsRepository)
}