import { Repository } from "../../ports/Repository.js";
import { DeviceId, Device } from "./Device.js";

// TODO: package private ???
export type DeviceRepository = Repository<DeviceId, Device>;
