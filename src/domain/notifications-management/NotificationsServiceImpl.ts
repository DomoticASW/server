import { Effect, map, mapError, runPromise, fail, succeed, flatMap, match, forEach, matchEffect } from "effect/Effect";
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
  private deviceSubscriptions: Map<DeviceId, Map<Token, Socket>> = new Map()

  constructor(deviceStatusesService: DeviceStatusesService, private io: Server, private devicesService: DevicesService, private usersService: UsersService, private subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) {
    deviceStatusesService.subscribeForDeviceStatusChanges(this)
    this.setupSocketHandling()
  }

  private setupSocketHandling() {
    this.io.on("connection", (socket: Socket) => {
      // The idea is that as soon the user logs in, it can start receiving notifications from tasks/automations 
      // or from offline devices if specified
      // Every time the user logs in, all their deviceOfflineNotificationSubscription will be reloaded
      socket.on("login", async ({ token }: { token: Token }) => {
        await runPromise(pipe(
          this.usersService.verifyToken(token),
          map(() => socket.data.email = token.userEmail),
          flatMap(() => this.loadSubscriptionsFromRepository(token, socket)),
          mapError(err => socket.emit(err.__brand, err.message + ": " + err.cause))
        ));
      })

      socket.on("disconnect", () => {
        const token = socket.data?.token
        if (token) {
          this.cleanupSocket(token, socket)
        }
      })
    })
  }

  private loadSubscriptionsFromRepository(token: Token, socket: Socket): Effect<void> {
    return pipe(
      this.subscriptionsRepository.getAll(),
      map(subscriptions => {
        for (const sub of subscriptions) {
          if (sub.email === token.userEmail) {
            this.registrySocket(sub.deviceId, token, socket)
          }
        }
      })
    );
  }

  private cleanupSocket(token: Token, socket: Socket) {
    for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
      if (subscribers.get(token) === socket) {
        subscribers.delete(token);
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
        map(() => this.registrySocket(deviceId, token, socket)),
        flatMap(() => this.addSubscriptionToRepository(token, deviceId)),
        matchEffect({
          onSuccess: () => succeed(undefined),
          onFailure: err => {
            switch (err.__brand) {
              case "DuplicateIdError":
                return succeed(undefined)
              default:
                return fail(err)
            }
          }
        })
      ))
    )
  }

  private addSubscriptionToRepository(token: Token, deviceId: DeviceId) {
    return pipe(
      this.subscriptionsRepository.find({ email: token.userEmail, deviceId }),
      matchEffect({
        onSuccess: () => succeed(undefined),
        onFailure: () => this.subscriptionsRepository.add(DeviceOfflineNotificationSubscription(token.userEmail, deviceId)),
      })
    );
  }

  private registrySocket(deviceId: DeviceId, token: Token, socket: Socket): void {
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Map());
    }
    this.deviceSubscriptions.get(deviceId)!.set(token, socket);
  }

  unsubscribeForDeviceOfflineNotifications(token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
    return pipe(
      this.findSocketByEmail(token.userEmail),
      flatMap(() => this.devicesService.find(token, deviceId)),
      map(() => {
        const subscribers = this.deviceSubscriptions.get(deviceId)
        if (subscribers) {
          subscribers.delete(token)

          if (subscribers.size === 0) {
            this.deviceSubscriptions.delete(deviceId)
          }
        }
      }),
      flatMap(() => this.subscriptionsRepository.find({ email: token.userEmail, deviceId: deviceId })),
      flatMap(subscription => this.subscriptionsRepository.remove(subscription)),
      matchEffect({
        onSuccess: () => succeed(undefined),
        onFailure: err => {
          switch (err.__brand) {
            case "NotFoundError":
              return succeed(undefined)
            default:
              return fail(err)
          }
        }
      })
    )
  }

  sendNotification(email: Email, message: string): Effect<void, UserNotFoundError> {
    return pipe(
      this.findSocketByEmail(email),
      map(socket => socket.emit("notification", { message })),
      mapError(err => UserNotFoundErrorMock(err.cause)) // Add real user Not found error 
    )
  }

  deviceStatusChanged(deviceId: DeviceId, status: DeviceStatus): Effect<void> {
    if (status === DeviceStatus.Offline) {
      const subscribers = this.deviceSubscriptions.get(deviceId);
      if (subscribers) {
        return pipe(
          forEach(subscribers.entries(), ([ token, socket ], ) => 
            pipe(
              this.usersService.verifyToken(token),
              flatMap(() => this.devicesService.find(token, deviceId)),
              match({
                onSuccess: (device) => socket.emit("notification", { message: `Device ${device.name} went offline.`, }),
                onFailure: error => {
                  switch (error.__brand) {
                    case "InvalidTokenError":
                      return this.unsubscribeForDeviceOfflineNotifications(token, deviceId)
                    case "DeviceNotFoundError":
                      return succeed(null)
                  }
                }
              })
            )
          )
        )
      }
    }

    return succeed(null)
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