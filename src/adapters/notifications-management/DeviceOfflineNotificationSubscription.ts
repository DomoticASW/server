/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, orDie, promise, tryPromise } from "effect/Effect";
import { DeviceId } from "../../domain/devices-management/Device.js";
import { DeviceOfflineNotificationSubscription } from "../../domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Email } from "../../domain/users-management/User.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";
import { Error } from "../../ports/Error.js";

interface DeviceOfflineNotificationSubscriptionSchema {
  _id: [string, string]
}

export class DeviceOfflineNotificationSubscriptionRepositoryMongoadapter implements DeviceOfflineNotificationSubscriptionRepository {

  private deviceOfflineNotificationSubscriptionSchema = new mongoose.Schema<DeviceOfflineNotificationSubscriptionSchema>({
      _id: [String, String]
  });

  private notification: mongoose.Model<DeviceOfflineNotificationSubscriptionSchema>

  constructor(connection: mongoose.Connection) {
      this.notification = connection.model("DeviceOfflineNotificationSubscription", this.deviceOfflineNotificationSubscriptionSchema, undefined, {overwriteModels: true})
  }

  add(entity: DeviceOfflineNotificationSubscription): Effect<void, DuplicateIdError> {
    return tryPromise({
        try: async () => {
            const notification = new this.notification({ _id: [entity.email, entity.deviceId]  });
            await notification.save();
        },
        catch: () => DuplicateIdError(),
    });
  }

  update(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
    throw Error
  }

  remove(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
    throw Error
  }

  getAll(): Effect<Iterable<DeviceOfflineNotificationSubscription>, never, never> {
    return tryPromise(async () => {
      const notifications = await this.notification.find();
      return notifications.map(notification => DeviceOfflineNotificationSubscription(notification._id[0], notification._id[1]))
    }).pipe(orDie);
  }

  find(id: [Email, DeviceId]): Effect<DeviceOfflineNotificationSubscription, NotFoundError, never> {
    throw Error
  }
}