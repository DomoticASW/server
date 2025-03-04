export interface Repository<Id, Entity> {
    add(e: Entity): DuplicateIdError | null
    update(e: Entity): NotFoundError | null
    remove(e: Entity): NotFoundError | null
    getAll(): Iterable<Entity>
    find(id: Id): Entity | NotFoundError
}

export class DuplicateIdError extends Error { }
export class NotFoundError extends Error { }