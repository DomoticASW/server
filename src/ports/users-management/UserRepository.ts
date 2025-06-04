import { DuplicateIdError, NotFoundError, Repository } from "../Repository.js";
import { Email, User } from "../../domain/users-management/User.js";
import { Effect } from "effect/Effect";

export interface UserRepository extends Repository<Email, User> {
    add(entity: User): Effect<void, DuplicateIdError>
    update(entity: User): Effect<void, NotFoundError>
}
