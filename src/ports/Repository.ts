import { Effect } from "effect/Effect";
import { NotFoundError, DuplicateIdError } from "./users-management/Errors.js";

export interface Repository<Id, Entity> {
    add(entity: Entity): Effect<void, DuplicateIdError>
    update(entity: Entity): Effect<void, NotFoundError>
    remove(entity: Entity): Effect<void, NotFoundError>
    getAll(): Effect<Iterable<Entity>, never>;
    find(id: Id): Effect<Entity, NotFoundError>
}
