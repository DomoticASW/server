import { Effect } from "effect/Effect";
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js";
import { DeviceGroupRepository } from "../../ports/devices-management/DeviceGroupRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";

export class DeviceGroupRepositoryMongoAdapter implements DeviceGroupRepository {

    address: URL

    constructor(mongoAddress: string) {
        const url = URL.parse("mongodb://" + mongoAddress)

        if (url) {
            this.address = url
        } else {
            throw new Error("bad mongo address: " + url);
        }

        mongoose.connect(url.toString())
    }

    private deviceGroupSchema = new mongoose.Schema({
        id: String,
        name: String
    });

    private DG = mongoose.model('DeviceGroup', this.deviceGroupSchema);

    add(entity: DeviceGroup): Effect<void, DuplicateIdError> {
        const user = new this.DG()
        user.id = entity.id
        user.name = entity.name
        await user.save()
        return createOk(undefined)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(entity: DeviceGroup): Effect<void, NotFoundError> {
        throw new Error("Method not implemented.");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    remove(entity: DeviceGroup): Effect<void, NotFoundError> {
        throw new Error("Method not implemented.");
    }
    getAll(): Effect<Iterable<DeviceGroup>, never> {
        throw new Error("Method not implemented.");
    }

    find(id: DeviceGroupId): Effect<DeviceGroup, NotFoundError> {
        const dg = await this.DG.findOne({ id: id })
        if (dg) {
            return createOk(this.DeviceGroup(dg.id, dg.name!))
        } else {
            return createErr({ message: "NotFound", __brand: "NotFoundError" })
        }
    }

    // TODO: delete
    DeviceGroup(id: DeviceGroupId, name: string): DeviceGroup {
        return {
            id: id,
            name: name,
            addDeviceToGroup(deviceId) {
                console.log(deviceId);
            },
            removeDeviceFromGroup(deviceId) {
                console.log(deviceId);
            },
        }
    }

}
