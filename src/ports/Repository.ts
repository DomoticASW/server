import { Result } from "option-t/plain_result";
import { Brand } from "../utils/Brand.js";

export interface Repository<Id, Entity> {
    add(entity: Entity): Result<undefined, DuplicateIdError>
    update(entity: Entity): Result<undefined, NotFoundError>
    remove(entity: Entity): Result<undefined, NotFoundError>
    getAll(): Iterable<Entity>;
    find(id: Id): Result<Entity, NotFoundError>
}

export type DuplicateIdError = Brand<string, "DuplicateIdError">

export type NotFoundError = Brand<string, "NotFoundError">
