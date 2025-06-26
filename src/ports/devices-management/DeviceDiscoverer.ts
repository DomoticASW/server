import { DiscoveredDevice } from "../../domain/devices-management/DiscoveredDevice.js";

export interface DeviceDiscoverer {
    discoveredDevices(): Iterable<DiscoveredDevice>
}
