import { Device, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"

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
    const d = Device(id, name, address, status, [], [], [])
    expect(d.id).toBe(id)
    expect(d.name).toBe(name)
    expect(d.address).toBe(address)
    expect(d.status).toBe(status)
    expect(d.properties).toEqual([])
    expect(d.actions).toEqual([])
    expect(d.events).toEqual([])
})
