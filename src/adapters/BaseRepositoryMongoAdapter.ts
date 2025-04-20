import mongoose from "mongoose";
import { Effect, pipe } from "effect";
import { isMongoServerError, MongoDBErrorCodes } from "../utils/MongoDBErrorCodes.js";
<<<<<<< HEAD
import { Repository, DuplicateIdError, NotFoundError, UniquenessConstraintViolatedError } from "../ports/Repository.js";
=======
import { DuplicateIdError, NotFoundError } from "../ports/users-management/Errors.js";
import { Repository } from "../ports/Repository.js";
>>>>>>> 8773785 (fix: update error imports)

export abstract class BaseRepositoryMongoAdapter<Id, Entity, SchemaId, Schema extends { _id: SchemaId }> implements Repository<Id, Entity> {
    private connection: mongoose.Connection;

    constructor(connection: mongoose.Connection) {
        this.connection = connection
    }

    add(entity: Entity): Effect.Effect<void, DuplicateIdError | UniquenessConstraintViolatedError> {
        return Effect.tryPromise({
            try: async () => {
                await this.init()
                await this.toDocument(entity).save()
            },
            catch(error) {
                if (isMongoServerError(error, MongoDBErrorCodes.DuplicateKey)) {
                    const typedError = error as { keyPattern: string }
                    if (JSON.stringify(typedError.keyPattern).includes("_id")) {
                        return DuplicateIdError()
                    } else {
                        return UniquenessConstraintViolatedError()
                    }
                } else {
                    throw error
                }
            },
        })
    }
    update(entity: Entity): Effect.Effect<void, NotFoundError | UniquenessConstraintViolatedError> {
        const id = this.toDocument(entity)._id
        return pipe(
            Effect.tryPromise({
                try: async () => {
                    await this.init()
                    return await this.model().findByIdAndUpdate(id, this.toDocument(entity))
                },
                catch(error) {
                    if (isMongoServerError(error, MongoDBErrorCodes.DuplicateKey))
                        return UniquenessConstraintViolatedError()
                    else
                        throw error
                },
            }),
            Effect.flatMap(document => {
                if (document) {
                    return Effect.succeed(null)
                } else {
                    return Effect.fail(NotFoundError())
                }
            })
        )
    }
    remove(id: Id): Effect.Effect<void, NotFoundError> {
        return pipe(
            Effect.tryPromise(async () => {
                await this.init()
                return await this.model().findByIdAndDelete(id)
            }),
            Effect.orDie,
            Effect.flatMap(document => {
                if (document) {
                    return Effect.succeed(null)
                } else {
                    return Effect.fail(NotFoundError())
                }
            })
        )
    }
    getAll(): Effect.Effect<Iterable<Entity>, never> {
        return pipe(
            Effect.tryPromise(async () => {
                await this.init()
                return await this.model().find()
            }),
            Effect.map(documents => documents.map(d => this.toEntity(d))),
            Effect.orDie
        )
    }
    find(id: Id): Effect.Effect<Entity, NotFoundError> {
        return pipe(
            Effect.tryPromise(async () => {
                await this.init()
                return await this.model().findById(id)
            }),
            Effect.orDie,
            Effect.flatMap(document => {
                if (document) {
                    return Effect.succeed(this.toEntity(document))
                } else {
                    return Effect.fail(NotFoundError())
                }
            })
        )
    }

    private didInit = false;
    private async init(): Promise<void> {
        if (!this.didInit) {
            this.didInit = true
            await this.model().ensureIndexes()
        }
    }

    protected abstract toDocument(e: Entity): mongoose.Document<unknown, object, Schema> & Schema

    protected abstract toEntity(s: Schema): Entity

    protected abstract model(): mongoose.Model<Schema>
}