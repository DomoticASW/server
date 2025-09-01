import { DeviceId } from "../../domain/devices-management/Device.js"
import { DuplicateIdError, NotFoundError, Repository } from "../Repository.js"
import { Email } from "../../domain/users-management/User.js"
import { DeviceOfflineNotificationSubscription } from "../../domain/notifications-management/DeviceOfflineNotificationSubscription.js"
import { Effect } from "effect/Effect"

export interface DeviceOfflineNotificationSubscriptionRepository
  extends Repository<{ email: Email; deviceId: DeviceId }, DeviceOfflineNotificationSubscription> {
  add(entity: DeviceOfflineNotificationSubscription): Effect<void, DuplicateIdError>
  update(entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError>
}
