import { DeviceId } from "../../domain/devices-management/Device.js";
import { Repository } from "../Repository.js"
import { Email } from "../../domain/users-management/User.js";
import { UserDevicePermission } from "../../domain/permissions-management/UserDevicePermission.js";

export type UserDevicePermissionRepository = Repository<[Email, DeviceId], UserDevicePermission>;

