import mongoose from "mongoose";
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js";
import { DeviceGroupRepository } from "../../ports/devices-management/DeviceGroupRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import { Effect } from "effect";

export class DeviceGroupRepositoryMongoAdapter implements DeviceGroupRepository {
    private deviceGroupSchema = new mongoose.Schema({
        _id: String,
        name: String,
    });
    private DG = mongoose.model('DeviceGroup', this.deviceGroupSchema);

    constructor(mongoAddress: string) {
        mongoose.connect(`mongodb://${mongoAddress}`);
    }

    add(entity: DeviceGroup): Effect.Effect<void, DuplicateIdError> {
        return Effect.tryPromise({
            try: async () => {
                const user = new this.DG({ _id: entity.id, name: entity.name });
                await user.save();
            },
            catch: () => this.DuplicateIdError(),
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(entity: DeviceGroup): Effect.Effect<void, NotFoundError> {
        return Effect.fail({ message: "Method not implemented.", __brand: "NotFoundError" });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    remove(entity: DeviceGroup): Effect.Effect<void, NotFoundError> {
        return Effect.fail({ message: "Method not implemented.", __brand: "NotFoundError" });
    }

    getAll(): Effect.Effect<Iterable<DeviceGroup>, never> {
        return Effect.tryPromise(async () => {
            const dgs = await this.DG.find();
            return dgs.map(dg => this.DeviceGroup(dg.id, dg.name!))
        }).pipe(Effect.orDie)
    }

    find(id: DeviceGroupId): Effect.Effect<DeviceGroup, NotFoundError> {
        return Effect.tryPromise(async () => {
            const dg = await this.DG.findById(id);
            if (!dg) throw new Error("NotFound");
            return this.DeviceGroup(dg.id, dg.name!);
        }).pipe(Effect.mapError(() => this.NotFoundError()))
    }

    // TODO: remove all function below
    DuplicateIdError(): DuplicateIdError {
        return { message: "An object with that id already exists", __brand: "DuplicateIdError" }
    }
    NotFoundError(): NotFoundError {
        return { message: "An object with that id does not exist", __brand: "NotFoundError" }
    }

    DeviceGroup(id: DeviceGroupId, name: string): DeviceGroup {
        return {
            id,
            name,
            addDeviceToGroup(deviceId) {
                console.log(deviceId);
            },
            removeDeviceFromGroup(deviceId) {
                console.log(deviceId);
            },
        };
    }
}
