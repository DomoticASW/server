import { DiscoveredDevice } from "./DevicesService.js";

export interface DeviceDiscoverer {
    discoveredDevices(): Iterable<DiscoveredDevice>
}
