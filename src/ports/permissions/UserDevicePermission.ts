import { DeviceId } from "../devices-management/Device.js";
import { UserId } from "../users-management/User.js";

export interface Ids {
  userId: UserId
  deviceId: DeviceId
}

export interface UserDevicePermission {
  ids: Ids
}