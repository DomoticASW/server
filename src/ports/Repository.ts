import { DuplicateIdError, NotFoundError } from "./Errors.js";

export interface Repository<Id, Entity> {
    add(entity: Entity): DuplicateIdError | null;
    update(entity: Entity): NotFoundError | null;
    remove(entity: Entity): NotFoundError | null;
    getAll(): Iterable<Entity>;
    find(id: Id): Entity | NotFoundError;
}