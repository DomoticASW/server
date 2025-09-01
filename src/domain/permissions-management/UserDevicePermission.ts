import { DeviceId } from "../devices-management/Device.js"
import { Email } from "../users-management/User.js"

export interface UserDevicePermission {
  readonly email: Email
  readonly deviceId: DeviceId
}

export function UserDevicePermission(email: Email, deviceId: DeviceId): UserDevicePermission {
  return new UserDevicePermissionImpl(email, deviceId)
}

class UserDevicePermissionImpl implements UserDevicePermission {
  readonly email: Email
  readonly deviceId: DeviceId

  constructor(email: Email, deviceId: DeviceId) {
    this.email = email
    this.deviceId = deviceId
  }
}
