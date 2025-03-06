import { DuplicateIdError, NotFoundError } from "../Errors.js";

export interface Repository<Id, Entity> {
    /**
     * Adds a new entity.
     * @param entity The entity to add.
     * @returns Possible error: DuplicateIdError
     */
    add(entity: Entity): DuplicateIdError | null;

    /**
     * Updates an existing entity.
     * @param entity The entity to update.
     * @returns Possible error: NotFoundError
     */
    update(entity: Entity): NotFoundError | null;

    /**
     * Removes an entity.
     * @param entity The entity to remove.
     * @returns Possible error: NotFoundError
     */
    remove(entity: Entity): NotFoundError | null;

    /**
     * Retrieves all entities.
     * @returns An iterable collection of entities.
     */
    getAll(): Iterable<Entity>;

    /**
     * Finds an entity by its ID.
     * @param id The ID of the entity.
     * @returns The entity or a NotFoundError.
     */
    find(id: Id): Entity | NotFoundError;
}