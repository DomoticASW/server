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

export function DeviceEventTrigger(deviceId: DeviceId, eventName: string): DeviceEventTrigger {
  return {
    deviceId: deviceId,
    eventName: eventName
  }
}

export function PeriodTrigger(start: Date, periodSeconds: number): PeriodTrigger {
  return {
    start: start,
    periodSeconds: periodSeconds
  }
}