import { DuplicateIdError, NotFoundError, Repository } from "../src/ports/Repository.js";
import { Effect } from "effect";

export class InMemoryRepositoryMock<Id, Entity> implements Repository<Id, Entity> {
    private map: Map<Id, Entity> = new Map()
    private idFromEntity: (e: Entity) => Id
    constructor(idFromEntity: (e: Entity) => Id) {
        this.idFromEntity = idFromEntity
    }

    callsToAdd = 0
    add(entity: Entity): Effect.Effect<void, DuplicateIdError> {
        this.callsToAdd += 1
        if (this.map.has(this.idFromEntity(entity))) {
            return Effect.fail(DuplicateIdError())
        }
        this.map.set(this.idFromEntity(entity), entity)
        return Effect.succeed(null)
    }

    callsToUpdate = 0
    update(entity: Entity): Effect.Effect<void, NotFoundError> {
        this.callsToUpdate += 1
        if (!this.map.has(this.idFromEntity(entity))) {
            return Effect.fail(NotFoundError())
        }
        this.map.set(this.idFromEntity(entity), entity)
        return Effect.succeed(null)
    }

    callsToRemove = 0
    remove(id: Id): Effect.Effect<void, NotFoundError> {
        this.callsToRemove += 1
        if (!this.map.delete(id)) {
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
        const e = this.map.get(id)
        if (e) {
            return Effect.succeed(e)
        } else {
            return Effect.fail(NotFoundError())
        }
    }
}
