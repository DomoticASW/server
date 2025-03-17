import { Result } from "option-t/plain_result";

export interface Repository<Id, Entity> {
    add(entity: Entity): Result<undefined, DuplicateIdError>
    update(entity: Entity): Result<undefined, NotFoundError>
    remove(entity: Entity): Result<undefined, NotFoundError>
    getAll(): Iterable<Entity>;
    find(id: Id): Result<Entity, NotFoundError>
}

export interface DuplicateIdError {
    readonly message: string;
}

export interface NotFoundError {
    readonly message: string;
}
