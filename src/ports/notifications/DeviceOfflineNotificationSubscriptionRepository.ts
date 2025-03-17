import { Repository } from '../Repository.js'
import { DeviceOfflineNotificationSubscription } from './DeviceOfflineNotificationSubscription.js'
import { Email, DeviceId } from './NotificationService.js'

export type DeviceOfflineNotificationSubscriptionRepository = Repository<[Email, DeviceId], DeviceOfflineNotificationSubscription>
