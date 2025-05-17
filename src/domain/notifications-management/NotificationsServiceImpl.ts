import { Effect, map, mapError, runPromise, fail, succeed, flatMap, catch as catch_, match, forEach } from "effect/Effect";
import { DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { UserNotFoundError } from "../../ports/users-management/Errors.js";
import { DeviceId, DeviceStatus } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { DeviceStatusesService } from "../../ports/devices-management/DeviceStatusesService.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { Server, Socket } from "socket.io"
import { UsersService } from "../../ports/users-management/UserService.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { pipe } from "effect";
import { DeviceOfflineNotificationSubscription } from "./DeviceOfflineNotificationSubscription.js";
import { UserNotFoundErrorMock } from "../../../test/domain/scripts-management/mocks.js";

class NotificationsServiceImpl implements NotificationsService {
  private deviceSubscriptions: Map<DeviceId, Map<Email, Socket>> = new Map()

  constructor(deviceStatusesService: DeviceStatusesService, private io: Server, private devicesService: DevicesService, private usersService: UsersService, private subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) {
    deviceStatusesService.subscribeForDeviceStatusChanges(this)
    this.setupSocketHandling()
  }

  // Change verifyToken to getUserUnsafe

  private setupSocketHandling() {
    this.io.on("connection", (socket: Socket) => {
      // The idea is that as soon the user logs in, it can start receiving notifications from tasks/automations 
      // or from offline devices if specified
      // Every time the user logs in, all their deviceOfflineNotificationSubscription will be reloaded
      socket.on("login", async ({ email }: { email: Email }) => {
        await runPromise(pipe(
          this.usersService.getUserDataUnsafe(email),
          map(() => socket.data.email = email),
          flatMap(() => this.loadSubscriptionsFromRepository(email, socket)),
          mapError(err => socket.emit(err.__brand, err.message + ": " + err.cause))
        ));
      })

      socket.on("disconnect", () => {
        const email = socket.data?.email
        if (email) {
          this.cleanupSocket(email, socket)
        }
      })
    })
  }

  private loadSubscriptionsFromRepository(email: Email, socket: Socket): Effect<void> {
    return pipe(
      this.subscriptionsRepository.getAll(),
      map(subscriptions => {
        for (const sub of subscriptions) {
          if (sub.email === email) {
            this.registrySocket(sub.deviceId, email, socket)
          }
        }
      })
    );
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

  subscribeForDeviceOfflineNotifications(email: Email, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError> {
    return pipe(
      this.findSocketByEmail(email),
      flatMap(socket => pipe(
        this.devicesService.findUnsafe(deviceId),
        map(() => this.registrySocket(deviceId, email, socket)),
        flatMap(() => this.subscriptionsRepository.add(DeviceOfflineNotificationSubscription(email, deviceId))),
        catch_("__brand", {
          failure: "DuplicateIdError",
          onFailure: () => succeed(undefined)
        })
      ))
    )
  }

  private registrySocket(deviceId: DeviceId, email: Email, socket: Socket): void {
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Map());
    }
    this.deviceSubscriptions.get(deviceId)!.set(email, socket);
  }

  unsubscribeForDeviceOfflineNotifications(email: Email, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError> {
    return pipe(
      this.findSocketByEmail(email),
      flatMap(() => this.devicesService.findUnsafe(deviceId)),
      map(() => {
        const subscribers = this.deviceSubscriptions.get(deviceId)
        if (subscribers) {
          subscribers.delete(email)

          if (subscribers.size === 0) {
            this.deviceSubscriptions.delete(deviceId)
          }
        }
      }),
      flatMap(() => this.subscriptionsRepository.find({ email: email, deviceId: deviceId })),
      flatMap(subscription => this.subscriptionsRepository.remove(subscription)),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: () => succeed(undefined)
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
          forEach(subscribers.entries(), ([ email, socket ], ) => 
            pipe(
              this.usersService.getUserDataUnsafe(email),
              flatMap(() => this.devicesService.findUnsafe(deviceId)),
              match({
                onSuccess: (device) => socket.emit("notification", { message: `Device ${device.name} went offline.`, }),
                onFailure: error => {
                  switch (error.__brand) {
                    case "UserNotFoundError":
                      return this.unsubscribeForDeviceOfflineNotifications(email, deviceId)
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

  private findSocketByEmail(email: Email): Effect<Socket, UserNotFoundError> {
    const sockets = this.io.sockets.sockets.values()
    for (const socket of sockets) {
      if (socket.data.email === email) {
        return succeed(socket)
      }
    }

    return fail(UserNotFoundErrorMock()) //Add real InvalidTokenError
  }
}

export function NotificationsService(deviceStatusesService: DeviceStatusesService, io: Server, devicesService: DevicesService, usersService: UsersService, subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) : NotificationsService {
  return new NotificationsServiceImpl(deviceStatusesService, io, devicesService, usersService, subscriptionsRepository)
}
