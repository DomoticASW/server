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

export class PeriodTriggerImpl implements PeriodTrigger {
  start: Date
  periodSeconds: number

  constructor(start: Date, periodSeconds: number) {
    this.start = start
    this.periodSeconds = periodSeconds
  }
}

export function PeriodTrigger(start: Date, periodSeconds: number): PeriodTrigger {
  return new PeriodTriggerImpl(start, periodSeconds)
}