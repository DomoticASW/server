import { DuplicateIdError, NotFoundError, Repository, UniquenessConstraintViolatedError } from "../src/ports/Repository.js";
import { Effect, pipe } from "effect";

export class InMemoryRepositoryMockCheckingUniqueness<Id, Entity> implements Repository<Id, Entity> {
    private map: Map<string, Entity> = new Map()
    private idFromEntity: (e: Entity) => Id
    private idToString: (id: Id) => string;
    private checkUniqueness: (e1: Entity, e2: Entity) => boolean;
    constructor(idFromEntity: (e: Entity) => Id, idToString: (id: Id) => string, checkUniqueness: (e1: Entity, e2: Entity) => boolean) {
        this.idFromEntity = idFromEntity
        this.idToString = idToString
        this.checkUniqueness = checkUniqueness
    }

    callsToAdd = 0
    add(entity: Entity): Effect.Effect<void, DuplicateIdError | UniquenessConstraintViolatedError> {
        this.callsToAdd += 1
        if (this.map.has(this.idToString(this.idFromEntity(entity)))) {
            return Effect.fail(DuplicateIdError())
        }
        if (Array.from(this.map.values()).find(e => !this.checkUniqueness(e, entity))) {
            return Effect.fail(UniquenessConstraintViolatedError())
        }
        this.map.set(this.idToString(this.idFromEntity(entity)), entity)
        return Effect.succeed(null)
    }

    callsToUpdate = 0
    update(entity: Entity): Effect.Effect<void, NotFoundError | UniquenessConstraintViolatedError> {
        this.callsToUpdate += 1
        const id = this.idFromEntity(entity)
        if (!this.map.has(this.idToString(id))) {
            return Effect.fail(NotFoundError())
        }
        if (Array.from(this.map.values()).find(e => this.idFromEntity(e) != id && !this.checkUniqueness(e, entity))) {
            return Effect.fail(UniquenessConstraintViolatedError())
        }
        this.map.set(this.idToString(id), entity)
        return Effect.succeed(null)
    }

    callsToRemove = 0
    remove(id: Id): Effect.Effect<void, NotFoundError> {
        this.callsToRemove += 1
        if (!this.map.delete(this.idToString(id))) {
            return Effect.fail(NotFoundError())
        }
        return Effect.succeed(null)
    }

    callsToGetAll = 0
    getAll(): Effect.Effect<Iterable<Entity>, never, never> {
        this.callsToGetAll += 1
        return Effect.succeed(Array.from(this.map.values()))
    }

    callsToFind = 0
    find(id: Id): Effect.Effect<Entity, NotFoundError, never> {
        this.callsToFind += 1
        const e = this.map.get(this.idToString(id))
        if (e) {
            return Effect.succeed(e)
        } else {
            return Effect.fail(NotFoundError())
        }
    }
}

export class InMemoryRepositoryMock<Id, Entity> extends InMemoryRepositoryMockCheckingUniqueness<Id, Entity> {
    constructor(idFromEntity: (e: Entity) => Id, idToString: (id: Id) => string) {
        super(idFromEntity, idToString, () => true)
    }

    add(entity: Entity): Effect.Effect<void, DuplicateIdError> {
        return pipe(
            super.add(entity),
            Effect.catchAll(e => {
                switch (e.__brand) {
                    case "UniquenessConstraintViolatedError":
                        return Effect.die(e)
                    default:
                        return Effect.fail(e)
                }
            })
        )
    }

    update(entity: Entity): Effect.Effect<void, NotFoundError> {
        return pipe(
            super.update(entity),
            Effect.catchAll(e => {
                switch (e.__brand) {
                    case "UniquenessConstraintViolatedError":
                        return Effect.die(e)
                    default:
                        return Effect.fail(e)
                }
            })
        )
    }
}