import { Repository } from "../../ports/Repository.js";
import { DeviceGroupId } from "./Device.js";
import { DeviceGroup } from "./DeviceGroup.js";

// TODO: package private ???
export type DeviceGroupRepository = Repository<DeviceGroupId, DeviceGroup>;
