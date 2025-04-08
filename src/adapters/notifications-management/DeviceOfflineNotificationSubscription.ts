/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, flatMap, orDie, succeed, fail, tryPromise, promise, runPromise } from "effect/Effect";
import { DeviceId } from "../../domain/devices-management/Device.js";
import { DeviceOfflineNotificationSubscription } from "../../domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Email } from "../../domain/users-management/User.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/users-management/Errors.js";
import mongoose from "mongoose";
import { pipe } from "effect";

interface DeviceOfflineNotificationSubscriptionSchema {
  _id: {
    email: string,
    deviceId: string
  }
}

export class DeviceOfflineNotificationSubscriptionRepositoryMongoadapter implements DeviceOfflineNotificationSubscriptionRepository {

  private deviceOfflineNotificationSubscriptionSchema = new mongoose.Schema<DeviceOfflineNotificationSubscriptionSchema>({
      _id: {
        email: { type: String, required: true},
        deviceId: { type: String, required: true}
      }
  });

  private notifications: mongoose.Model<DeviceOfflineNotificationSubscriptionSchema>

  constructor(connection: mongoose.Connection) {
      this.notifications = connection.model("DeviceOfflineNotificationSubscription", this.deviceOfflineNotificationSubscriptionSchema, undefined, {overwriteModels: true})
  }

  add(entity: DeviceOfflineNotificationSubscription): Effect<void, DuplicateIdError> {
    return tryPromise({
        try: async () => {
            const notification = new this.notifications({ _id: { email: entity.email, deviceId: entity.deviceId } });
            await notification.save();
        },
        catch: () => DuplicateIdError(),
    });
  }

  update(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
    return tryPromise({
      try: async () => {
        await runPromise(this.find(entity));
      },
      catch: () => NotFoundError()
    });
  }

  remove(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
    const promise = async () => await this.notifications.findByIdAndDelete(entity)
    return pipe(
      tryPromise(promise),
      orDie,
      flatMap(notification => {
          if (notification) {
              return succeed(null)
          } else {
              return fail(NotFoundError())
          }
      })
    )
  }

  getAll(): Effect<Iterable<DeviceOfflineNotificationSubscription>, never, never> {
    return tryPromise(async () => {
      const notifications = await this.notifications.find();
      return notifications.map(notification => this.toEntity(notification))
    }).pipe(orDie);
  }

  find(id: { email: Email, deviceId: DeviceId }): Effect<DeviceOfflineNotificationSubscription, NotFoundError, never> {
    const promise = async () => await this.notifications.findById(id)
    return pipe(
        tryPromise(promise),
        orDie,
        flatMap(notification => {
            if (notification) {
                return succeed(this.toEntity(notification))
            } else {
                return fail(NotFoundError())
            }
        })
    )
  }

  toEntity(notification: DeviceOfflineNotificationSubscriptionSchema): DeviceOfflineNotificationSubscription {
    return DeviceOfflineNotificationSubscription(Email(notification._id.email), DeviceId(notification._id.deviceId))
  }
}