import { DeviceId } from '../../domain/devices-management/Device.js'
import { Repository } from '../Repository.js'
import { Email } from '../../domain/users-management/User.js'
import { DeviceOfflineNotificationSubscription } from '../../domain/notifications/DeviceOfflineNotificationSubscription.js'

export type DeviceOfflineNotificationSubscriptionRepository = Repository<[Email, DeviceId], DeviceOfflineNotificationSubscription>
