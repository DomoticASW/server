import { Effect, map, succeed, flatMap, catch as catch_, match, if as if_ } from "effect/Effect";
import { DeviceNotFoundError } from "../../ports/devices-management/Errors.js";
import { NotificationsService } from "../../ports/notifications-management/NotificationsService.js";
import { UserNotFoundError } from "../../ports/users-management/Errors.js";
import { DeviceId, DeviceStatus } from "../devices-management/Device.js";
import { Email } from "../users-management/User.js";
import { DeviceStatusesService } from "../../ports/devices-management/DeviceStatusesService.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { UsersService } from "../../ports/users-management/UserService.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { pipe } from "effect";
import { DeviceOfflineNotificationSubscription } from "./DeviceOfflineNotificationSubscription.js";
import { NotificationProtocol } from "../../ports/notifications-management/NotificationProtocol.js";

class NotificationsServiceImpl implements NotificationsService {
  private notificationProtocol?: NotificationProtocol

  constructor(deviceStatusesService: DeviceStatusesService, private devicesService: DevicesService, private usersService: UsersService, private subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) {
    deviceStatusesService.subscribeForDeviceStatusChanges(this)
  }

  setupNotificationProtocol(notificationProtocol: NotificationProtocol): void {
    this.notificationProtocol = notificationProtocol
  }

  // Change verifyToken to getUserUnsafe

  // private setupSocketHandling() {
  //   this.io.on("connection", (socket: Socket) => {
  //     // The idea is that as soon the user logs in, it can start receiving notifications from tasks/automations 
  //     // or from offline devices if specified
  //     // Every time the user logs in, all their deviceOfflineNotificationSubscription will be reloaded
  //     socket.on("login", async ({ email }: { email: Email }) => {
  //       await runPromise(pipe(
  //         this.usersService.getUserDataUnsafe(email),
  //         map(() => socket.data.email = email),
  //         flatMap(() => this.loadSubscriptionsFromRepository(email, socket)),
  //         mapError(err => socket.emit(err.__brand, err.message + ": " + err.cause))
  //       ));
  //     })

  //     socket.on("disconnect", () => {
  //       const email = socket.data?.email
  //       if (email) {
  //         this.cleanupSocket(email, socket)
  //       }
  //     })
  //   })
  // }

  // private loadSubscriptionsFromRepository(email: Email, socket: Socket): Effect<void> {
  //   return pipe(
  //     this.subscriptionsRepository.getAll(),
  //     map(subscriptions => {
  //       for (const sub of subscriptions) {
  //         if (sub.email === email) {
  //           this.registrySocket(sub.deviceId, email, socket)
  //         }
  //       }
  //     })
  //   );
  // }

  // private cleanupSocket(email: Email, socket: Socket) {
  //   for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
  //     if (subscribers.get(email) === socket) {
  //       subscribers.delete(email);
  //       if (subscribers.size === 0) {
  //         this.deviceSubscriptions.delete(deviceId);
  //       }
  //     }
  //   }
  // }

  subscribeForDeviceOfflineNotifications(email: Email, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError> {
    return pipe(
      this.devicesService.findUnsafe(deviceId),
      flatMap(() => this.usersService.getUserDataUnsafe(email)),
      flatMap(() => this.subscriptionsRepository.add(DeviceOfflineNotificationSubscription(email, deviceId))),
      catch_("__brand", {
        failure: "DuplicateIdError",
        onFailure: () => succeed(undefined)
      })
    )
  }

  unsubscribeForDeviceOfflineNotifications(email: Email, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError> {
    return pipe(
      this.devicesService.findUnsafe(deviceId),
      flatMap(() => this.usersService.getUserDataUnsafe(email)),
      flatMap(() => this.subscriptionsRepository.remove(DeviceOfflineNotificationSubscription(email, deviceId))),
      catch_("__brand", {
        failure: "NotFoundError",
        onFailure: () => succeed(undefined)
      })
    )
  }

  sendNotification(email: Email, message: string): Effect<void, UserNotFoundError> {
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      map(() => this.notificationProtocol!.sendNotification(email, message) )
    )
  }

  deviceStatusChanged(deviceId: DeviceId, status: DeviceStatus): Effect<void> {
    if (status === DeviceStatus.Offline) {
      return pipe(
        this.subscriptionsRepository.getAll(),
        flatMap(subscriptions => succeed(Array.from(subscriptions).find(s => s.deviceId == deviceId))),
        flatMap(subscription =>
          if_(subscription != undefined, {
            onTrue: () => this.sendNotificationToSubscriber(subscription!, deviceId),
            onFalse: () => succeed(undefined)
          })
        )
      )
    }

    return succeed(undefined)
  }


  private sendNotificationToSubscriber(subscription: DeviceOfflineNotificationSubscription, deviceId: DeviceId) {
    const email = subscription.email;
    return pipe(
      this.usersService.getUserDataUnsafe(email),
      flatMap(() => this.devicesService.findUnsafe(deviceId)),
      match({
        onSuccess: (device) => this.notificationProtocol!.sendNotification(email, `Device ${device.name} went offline.`),
        onFailure: error => {
          switch (error.__brand) {
            case "UserNotFoundError":
              return this.unsubscribeForDeviceOfflineNotifications(email, deviceId);
            case "DeviceNotFoundError":
              return succeed(null);
          }
        }
      })
    );
  }
  // private findSocketByEmail(email: Email): Effect<Socket, UserNotFoundError> {
  //   const sockets = this.io.sockets.sockets.values()
  //   for (const socket of sockets) {
  //     if (socket.data.email === email) {
  //       return succeed(socket)
  //     }
  //   }

  //   return fail(UserNotFoundErrorMock()) //Add real InvalidTokenError
  // }
}

export function NotificationsService(deviceStatusesService: DeviceStatusesService, devicesService: DevicesService, usersService: UsersService, subscriptionsRepository: DeviceOfflineNotificationSubscriptionRepository) : NotificationsService {
  return new NotificationsServiceImpl(deviceStatusesService, devicesService, usersService, subscriptionsRepository)
}
