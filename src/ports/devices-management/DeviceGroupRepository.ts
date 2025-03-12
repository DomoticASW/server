import { Repository } from "../../ports/Repository.js";
import { DeviceGroupId } from "../../domain/devices-management/Device.js";
import { DeviceGroup } from "../../domain/devices-management/DeviceGroup.js";

export type DeviceGroupRepository = Repository<DeviceGroupId, DeviceGroup>;
