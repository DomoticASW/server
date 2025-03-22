import { Result } from "option-t/plain_result";
import { Brand } from "../utils/Brand.js";
import { Error } from "./Error.js";

export interface Repository<Id, Entity> {
    add(entity: Entity): Result<undefined, DuplicateIdError>
    update(entity: Entity): Result<undefined, NotFoundError>
    remove(entity: Entity): Result<undefined, NotFoundError>
    getAll(): Iterable<Entity>;
    find(id: Id): Result<Entity, NotFoundError>
}

export type DuplicateIdError = Brand<Error, "DuplicateIdError">

export type NotFoundError = Brand<Error, "NotFoundError">
