import mongoose from "mongoose";
import { Effect, pipe } from "effect";
import { isMongoServerError, MongoDBErrorCodes } from "../utils/MongoDBErrorCodes.js";
import { Repository, DuplicateIdError, NotFoundError } from "../ports/Repository.js";

export abstract class BaseRepositoryMongoAdapter<Id, Entity, SchemaId, Schema extends { _id: SchemaId }> implements Repository<Id, Entity> {
    private connection: mongoose.Connection;

    constructor(connection: mongoose.Connection) {
        this.connection = connection
    }

    add(entity: Entity): Effect.Effect<void, DuplicateIdError> {
        const promise = async () => await this.toDocument(entity).save()
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
    update(entity: Entity): Effect.Effect<void, NotFoundError> {
        const id = this.toDocument(entity)._id
        const promise = async () => await this.model().findByIdAndUpdate(id, this.toDocument(entity))
        return pipe(
            Effect.tryPromise(promise),
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
    remove(id: Id): Effect.Effect<void, NotFoundError> {
        const promise = async () => await this.model().findByIdAndDelete(id)
        return pipe(
            Effect.tryPromise(promise),
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
            Effect.tryPromise(async () => await this.model().find()),
            Effect.map(documents => documents.map(d => this.toEntity(d))),
            Effect.orDie
        )
    }
    find(id: Id): Effect.Effect<Entity, NotFoundError> {
        const promise = async () => await this.model().findById(id)
        return pipe(
            Effect.tryPromise(promise),
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

    protected abstract toDocument(e: Entity): mongoose.Document<unknown, object, Schema> & Schema

    protected abstract toEntity(s: Schema): Entity

    protected abstract model(): mongoose.Model<Schema>
}