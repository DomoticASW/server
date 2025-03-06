import { Repository } from '../repository/Repository.js'
import { DeviceOfflineNotificationSubscription } from './DeviceOfflineNotificationSubscription.js'
import { UserId, DeviceId } from './NotificationService.js'

export type DeviceOfflineNotificationSubscriptionRepository = Repository<[UserId, DeviceId], DeviceOfflineNotificationSubscription>