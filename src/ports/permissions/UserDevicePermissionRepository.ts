import { DeviceId } from "../devices-management/Device.js";
import { Repository } from "../Repository.js"
import { Email } from "../users-management/User.js";
import { UserDevicePermission } from "./UserDevicePermission.js";

export type UserDevicePermissionRepository = Repository<[Email, DeviceId], UserDevicePermission>;
