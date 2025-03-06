export type Trigger = object

export interface DeviceEventTrigger extends Trigger {
  deviceId: DeviceId
  eventName: string
}

type DeviceId = string

export interface PeriodTrigger extends Trigger {
  start: Date
  periodsLong: number
}