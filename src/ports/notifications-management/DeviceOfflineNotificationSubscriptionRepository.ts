import { DeviceId } from '../../domain/devices-management/Device.js'
import { Repository } from '../Repository.js'
import { Email } from '../../domain/users-management/User.js'
import { DeviceOfflineNotificationSubscription } from '../../domain/notifications-management/DeviceOfflineNotificationSubscription.js'

export type DeviceOfflineNotificationSubscriptionRepository = Repository<{ email: Email, deviceId: DeviceId }, DeviceOfflineNotificationSubscription>
