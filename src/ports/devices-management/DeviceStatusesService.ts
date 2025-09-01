import { Effect } from "effect/Effect"
import { DeviceId, DeviceStatus } from "../../domain/devices-management/Device.js"

export interface DeviceStatusesService {
  subscribeForDeviceStatusChanges(subscriber: DeviceStatusChangesSubscriber): void
  unsubscribeForDeviceStatusChanges(subscriber: DeviceStatusChangesSubscriber): void
}
export interface DeviceStatusChangesSubscriber {
  deviceStatusChanged(deviceId: DeviceId, status: DeviceStatus): Effect<void>
}
