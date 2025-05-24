import { DuplicateIdError, NotFoundError, Repository } from "../../ports/Repository.js";
import { DeviceId, Device } from "../../domain/devices-management/Device.js";
import { Effect } from "effect/Effect";

export interface DeviceRepository extends Repository<DeviceId, Device> {
    add(entity: Device): Effect<void, DuplicateIdError>
    update(entity: Device): Effect<void, NotFoundError>
}
