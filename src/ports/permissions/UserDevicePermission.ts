import { DeviceId } from "../../domain/devices-management/Device.js";
import { Email } from "../users-management/User.js";

export interface UserDevicePermission {
  readonly email: Email
  readonly deviceId: DeviceId
}