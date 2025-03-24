import { Effect } from "effect/Effect";
import { Brand } from "../utils/Brand.js";
import { Error } from "./Error.js";

export interface Repository<Id, Entity> {
    add(entity: Entity): Effect<void, DuplicateIdError>
    update(entity: Entity): Effect<void, NotFoundError>
    remove(entity: Entity): Effect<void, NotFoundError>
    getAll(): Iterable<Entity>;
    find(id: Id): Effect<Entity, NotFoundError>
}

export type DuplicateIdError = Brand<Error, "DuplicateIdError">

export type NotFoundError = Brand<Error, "NotFoundError">
