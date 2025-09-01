import { Repository } from "../../ports/Repository.js"
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js"

export type DeviceGroupRepository = Repository<DeviceGroupId, DeviceGroup>
