import { Effect } from "effect/Effect";
import { Brand } from "../utils/Brand.js";
import { Error } from "./Error.js"

export interface Repository<Id, Entity> {
    add(entity: Entity): Effect<void, DuplicateIdError | UniquenessConstraintViolatedError>
    update(entity: Entity): Effect<void, NotFoundError | UniquenessConstraintViolatedError>
    remove(id: Id): Effect<void, NotFoundError>
    getAll(): Effect<Iterable<Entity>, never>;
    find(id: Id): Effect<Entity, NotFoundError>
}

export type DuplicateIdError = Brand<Error, "DuplicateIdError">

export function DuplicateIdError(cause?: string): DuplicateIdError {
    return { message: "Id already in use", cause: cause, __brand: "DuplicateIdError" }
}

export type NotFoundError = Brand<Error, "NotFoundError">

export function NotFoundError(cause?: string): NotFoundError {
    return { message: "Not found", cause: cause, __brand: "NotFoundError" }
}

export type UniquenessConstraintViolatedError = Brand<Error, "UniquenessConstraintViolatedError">

export function UniquenessConstraintViolatedError(cause?: string): UniquenessConstraintViolatedError {
    return { message: "A uniqueness constraint was violated", cause: cause, __brand: "UniquenessConstraintViolatedError" }
}
