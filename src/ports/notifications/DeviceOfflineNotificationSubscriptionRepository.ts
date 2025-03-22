import { DeviceId } from '../../domain/devices-management/Device.js'
import { Repository } from '../Repository.js'
import { Email } from '../users-management/User.js'
import { DeviceOfflineNotificationSubscription } from './DeviceOfflineNotificationSubscription.js'

export type DeviceOfflineNotificationSubscriptionRepository = Repository<[Email, DeviceId], DeviceOfflineNotificationSubscription>
