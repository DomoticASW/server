import { Result } from "option-t/plain_result";
import { DuplicateIdError, NotFoundError } from "./users-management/Errors.js";

export interface Repository<Id, Entity> {
    add(entity: Entity): Result<undefined, DuplicateIdError>
    update(entity: Entity): Result<undefined, NotFoundError>
    remove(entity: Entity): Result<undefined, NotFoundError>
    getAll(): Iterable<Entity>;
    find(id: Id): Result<Entity, NotFoundError>
}
