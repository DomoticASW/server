import { DeviceId } from "../../domain/devices-management/Device.js"
import { DuplicateIdError, NotFoundError, Repository } from "../Repository.js"
import { Email } from "../../domain/users-management/User.js"
import { UserDevicePermission } from "../../domain/permissions-management/UserDevicePermission.js"
import { Effect } from "effect/Effect"

export interface UserDevicePermissionRepository
  extends Repository<[Email, DeviceId], UserDevicePermission> {
  add(entity: UserDevicePermission): Effect<void, DuplicateIdError>
  update(entity: UserDevicePermission): Effect<void, NotFoundError>
}
