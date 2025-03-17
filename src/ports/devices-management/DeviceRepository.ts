import { Repository } from "../../ports/Repository.js";
import { DeviceId, Device } from "../../domain/devices-management/Device.js";

export type DeviceRepository = Repository<DeviceId, Device>;
