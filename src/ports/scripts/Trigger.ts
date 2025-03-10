export type Trigger = PeriodTrigger | DeviceEventTrigger

export interface DeviceEventTrigger {
  deviceId: DeviceId
  eventName: string
}

type DeviceId = string

export interface PeriodTrigger {
  start: Date
  periodsLong: number
}