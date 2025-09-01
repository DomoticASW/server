import { Brand } from "../../utils/Brand.js"
import { DeviceId } from "./Device.js"

export type DeviceGroupId = Brand<string, "DeviceGroupId">
export function DeviceGroupId(id: string): DeviceGroupId {
  return id as DeviceGroupId
}

export interface DeviceGroup {
  readonly id: DeviceGroupId
  name: string
  readonly devices: DeviceId[]

  addDeviceToGroup(deviceId: DeviceId): void
  removeDeviceFromGroup(deviceId: DeviceId): void
}

export function DeviceGroup(id: DeviceGroupId, name: string, devices: DeviceId[]): DeviceGroup {
  return new DeviceGroupImpl(id, name, devices)
}

class DeviceGroupImpl implements DeviceGroup {
  readonly id: DeviceGroupId
  name: string
  private _devices: DeviceId[]

  constructor(id: DeviceGroupId, name: string, devices: DeviceId[]) {
    this.id = id
    this.name = name
    this._devices = [...devices]
  }

  get devices(): DeviceId[] {
    return [...this._devices]
  }

  addDeviceToGroup(deviceId: DeviceId): void {
    if (!this._devices.find((d) => d == deviceId)) {
      this._devices.push(deviceId)
    }
  }
  removeDeviceFromGroup(deviceId: DeviceId): void {
    const index = this.devices.findIndex((d) => d == deviceId)
    if (index >= 0) {
      this._devices.splice(index, 1)
    }
  }
}
