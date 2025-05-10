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

export class PeriodTriggerImpl implements PeriodTrigger {
  start: Date
  periodSeconds: number

  constructor(start: Date, periodSeconds: number) {
    this.start = start
    this.periodSeconds = periodSeconds
  }
}

export class DeviceEventTriggerImpl implements DeviceEventTrigger {
  deviceId: DeviceId
  eventName: string

  constructor(deviceId: DeviceId, eventName: string) {
    this.deviceId = deviceId
    this.eventName = eventName
  }
}

export function PeriodTrigger(start: Date, periodSeconds: number): PeriodTrigger {
  return new PeriodTriggerImpl(start, periodSeconds)
}

export function DeviceEventTrigger(deviceId: DeviceId, eventName: string): DeviceEventTrigger {
  return new DeviceEventTriggerImpl(deviceId, eventName)
}