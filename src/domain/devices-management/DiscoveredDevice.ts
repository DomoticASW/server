import { DeviceAddress, DeviceId } from "./Device.js"

export interface DiscoveredDevice {
  readonly id: DeviceId
  readonly name: string
  readonly address: DeviceAddress
}
export function DiscoveredDevice(
  id: DeviceId,
  name: string,
  address: DeviceAddress
): DiscoveredDevice {
  return { id, name, address }
}
