import { DeviceId } from "../../../src/domain/devices-management/Device.js"
import { DeviceEventTrigger, PeriodTrigger } from "../../../src/domain/scripts-management/Trigger.js"

test("A DeviceEventTrigger can be created", () => {
  const deviceId = DeviceId("1")
  const name = "eventName"
  const deviceEventTrigger = DeviceEventTrigger(deviceId, name)

  expect(deviceEventTrigger.deviceId).toBe(deviceId)
  expect(deviceEventTrigger.eventName).toBe(name)
})

test("A PeriodTrigger can be created", () => {
  const startDate = new Date()
  const periodSeconds = 15.5

  const periodTrigger = PeriodTrigger(startDate, periodSeconds)

  expect(periodTrigger.start).toBe(startDate)
  expect(periodTrigger.periodSeconds).toBe(periodSeconds)
})
