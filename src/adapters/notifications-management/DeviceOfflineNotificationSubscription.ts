/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, orDie, promise, tryPromise } from "effect/Effect";
import { DeviceId } from "../../domain/devices-management/Device.js";
import { DeviceOfflineNotificationSubscription } from "../../domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Email } from "../../domain/users-management/User.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";

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

  private notification: mongoose.Model<DeviceOfflineNotificationSubscriptionSchema>

  constructor(connection: mongoose.Connection) {
      this.notification = connection.model("DeviceOfflineNotificationSubscription", this.deviceOfflineNotificationSubscriptionSchema, undefined, {overwriteModels: true})
  }

  add(entity: DeviceOfflineNotificationSubscription): Effect<void, DuplicateIdError> {
    return tryPromise({
        try: async () => {
            const notification = new this.notification({ _id: { email: entity.email, deviceId: entity.deviceId } });
            await notification.save();
        },
        catch: () => DuplicateIdError(),
    });
  }

  update(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
    throw Error("Not yet implemented")
  }

  remove(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
    throw Error("Not yet implemented")
  }

  getAll(): Effect<Iterable<DeviceOfflineNotificationSubscription>, never, never> {
    return tryPromise(async () => {
      const notifications = await this.notification.find();
      return notifications.map(notification => DeviceOfflineNotificationSubscription(notification._id.email, notification._id.deviceId))
    }).pipe(orDie);
  }

  find(id: [Email, DeviceId]): Effect<DeviceOfflineNotificationSubscription, NotFoundError, never> {
    throw Error("Not yet implemented")
  }
}