import { DeviceId } from "../devices-management/Device.js"

export type Trigger = PeriodTrigger | DeviceEventTrigger

export interface DeviceEventTrigger {
  deviceId: DeviceId
  eventName: string
}

export interface PeriodTrigger {
  start: Date
  periodSeconds: number
}