import { DeviceId } from "../devices-management/Device.js";
import { UserId } from "../users-management/User.js";

export interface UserDevicePermission {
  readonly userId: UserId
  readonly deviceId: DeviceId
}