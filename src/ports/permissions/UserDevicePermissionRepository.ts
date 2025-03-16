import { DeviceId } from "../devices-management/Device.js";
import { Repository } from "../Repository.js"
import { UserId } from "../users-management/User.js";
import { UserDevicePermission } from "./UserDevicePermission.js";

export type UserDevicePermissionRepository = Repository<[UserId, DeviceId], UserDevicePermission>;