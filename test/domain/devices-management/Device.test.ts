<<<<<<< HEAD
import { DeviceId } from "../../../src/domain/devices-management/Device.js";

test("DeviceId can be created", () => {
  const deviceId = DeviceId("Id");
  expect(deviceId).toBe("Id");
});
=======
import { Device, DeviceEvent, DeviceId, DeviceStatus, DeviceProperty, DeviceAction } from "../../../src/domain/devices-management/Device.js"

interface MakeDeviceParameters {
    id?: string,
    name?: string,
    address?: string,
    status?: DeviceStatus,
    properties?: DeviceProperty<unknown>[],
    actions?: DeviceAction<unknown>[],
    events?: DeviceEvent[],
}
function makeDevice({
    id = "1",
    name = "Lamp",
    address = "https://192.168.0.2:8080",
    status = DeviceStatus.Online,
    properties = [],
    actions = [],
    events = []
}: MakeDeviceParameters) {
    return Device(DeviceId(id), name, new URL(address), status, properties, actions, events)
}

test("DeviceId creation", () => {
    const idValue = "1"
    const id = DeviceId(idValue)
    expect(id).toBe(idValue)
})

test("Device creation", () => {
    const id = DeviceId("1")
    const name = "Lamp"
    const address = new URL("https://192.168.0.2:8080")
    const status = DeviceStatus.Online
    const events = [DeviceEvent("low battery"), DeviceEvent("full battery")]
    const d = Device(id, name, address, status, [], [], events)
    expect(d.id).toBe(id)
    expect(d.name).toBe(name)
    expect(d.address).toBe(address)
    expect(d.status).toBe(status)
    expect(d.properties).toEqual([])
    expect(d.actions).toEqual([])
    expect(d.events).toEqual(events)
})

test("DeviceEvent creation", () => {
    const name = "washing done"
    const event = DeviceEvent(name)
    expect(event.name).toBe(name)
})
>>>>>>> 59acb1e (feat: add DeviceEvent tests and impl)
