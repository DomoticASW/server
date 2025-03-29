import mongoose from "mongoose";
import { Effect, pipe } from "effect";
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js";
import { DeviceGroupRepository } from "../../ports/devices-management/DeviceGroupRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import { isMongoServerError, MongoDBErrorCodes } from "../../utils/MongoDBErrorCodes.js";

interface DeviceGroupSchema {
    _id: string,
    name: string
}

export class DeviceGroupRepositoryMongoAdapter implements DeviceGroupRepository {
    private connection: mongoose.Connection;

    private deviceGroupSchema = new mongoose.Schema<DeviceGroupSchema>({
        _id: { type: String, required: true },
        name: { type: String, required: true }
    });
    private DG: mongoose.Model<DeviceGroupSchema>

    constructor(connection: mongoose.Connection) {
        this.connection = connection
        this.DG = connection.model("DeviceGroup", this.deviceGroupSchema, undefined, { overwriteModels: true })
    }

    add(entity: DeviceGroup): Effect.Effect<void, DuplicateIdError> {
        const promise = async () => await this.toSchema(entity).save()
        return Effect.tryPromise({
            try: promise,
            catch(error) {
                if (isMongoServerError(error, MongoDBErrorCodes.DuplicateKey))
                    return DuplicateIdError()
                else {
                    throw error
                }
            },
        })
    }
    update(entity: DeviceGroup): Effect.Effect<void, NotFoundError> {
        const promise = async () => await this.DG.findByIdAndUpdate(entity.id, entity)
        return pipe(
            Effect.tryPromise(promise),
            Effect.orDie,
            Effect.flatMap(dg => {
                if (dg) {
                    return Effect.succeed(null)
                } else {
                    return Effect.fail(NotFoundError())
                }
            })
        )
    }
    remove(id: DeviceGroupId): Effect.Effect<void, NotFoundError> {
        const promise = async () => await this.DG.findByIdAndDelete(id)
        return pipe(
            Effect.tryPromise(promise),
            Effect.orDie,
            Effect.flatMap(dg => {
                if (dg) {
                    return Effect.succeed(null)
                } else {
                    return Effect.fail(NotFoundError())
                }
            })
        )
    }
    getAll(): Effect.Effect<Iterable<DeviceGroup>, never> {
        return pipe(
            Effect.tryPromise(async () => await this.DG.find()),
            Effect.map(dgs => dgs.map(dg => this.toEntity(dg))),
            Effect.orDie
        )
    }
    find(id: DeviceGroupId): Effect.Effect<DeviceGroup, NotFoundError> {
        const promise = async () => await this.DG.findById(id)
        return pipe(
            Effect.tryPromise(promise),
            Effect.orDie,
            Effect.flatMap(dg => {
                if (dg) {
                    return Effect.succeed(this.toEntity(dg))
                } else {
                    return Effect.fail(NotFoundError())
                }
            })
        )
    }

    private toSchema(dg: DeviceGroup) {
        return new this.DG({ _id: dg.id, name: dg.name })
    }

    private toEntity(dgs: DeviceGroupSchema): DeviceGroup {
        return DeviceGroup(DeviceGroupId(dgs._id), dgs.name)
    }
}