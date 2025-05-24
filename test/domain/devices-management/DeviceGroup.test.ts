import { DeviceId } from "../../../src/domain/devices-management/Device.js"
import { DeviceGroup, DeviceGroupId } from "../../../src/domain/devices-management/DeviceGroup.js"

function makeDeviceGroup(id: string = "1", name: string = "Bedroom", devices: DeviceId[] = []) {
    return DeviceGroup(DeviceGroupId(id), name, devices)
}

test("DeviceGroupId creation", () => {
    const idValue = "1"
    const id = DeviceGroupId(idValue)
    expect(id).toBe(idValue)
})

test("DeviceGroup creation", () => {
    const idValue = "1"
    const name = "Bedroom"
    const id = DeviceGroupId(idValue)
    const devices = [DeviceId("1"), DeviceId("2")]
    const dg = DeviceGroup(id, name, devices)
    expect(dg.id).toBe(id)
    expect(dg.name).toBe(name)
    expect(dg.devices).toEqual(devices)
})

test("DeviceGroup is initially empty", () => {
    expect(makeDeviceGroup().devices).toHaveLength(0)
})

test("Add device to device group", () => {
    const dg = makeDeviceGroup()
    const deviceId = DeviceId("1")
    dg.addDeviceToGroup(deviceId)
    expect(dg.devices).toHaveLength(1)
    expect(dg.devices).toContain(deviceId)
})

test("Add device to device group does not create duplicates", () => {
    const dg = makeDeviceGroup()
    const deviceId = DeviceId("1")
    dg.addDeviceToGroup(deviceId)
    dg.addDeviceToGroup(deviceId)
    expect(dg.devices).toHaveLength(1)
    expect(dg.devices).toContain(deviceId)
})

test("Remove device from group", () => {
    const dg = makeDeviceGroup()
    const deviceId = DeviceId("1")
    dg.addDeviceToGroup(deviceId)
    dg.removeDeviceFromGroup(deviceId)
    expect(dg.devices).toHaveLength(0)
    expect(dg.devices).not.toContain(deviceId)
})

test("DeviceGroup.devices cannot be modified directly", () => {
    const dg = makeDeviceGroup()
    const deviceId = DeviceId("1")
    dg.addDeviceToGroup(deviceId)
    dg.devices.pop()
    expect(dg.devices).toContain(deviceId)
})
