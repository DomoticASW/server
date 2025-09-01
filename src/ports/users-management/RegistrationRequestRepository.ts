import { DuplicateIdError, NotFoundError, Repository } from "../Repository.js"
import { Email } from "../../domain/users-management/User.js"
import { RegistrationRequest } from "../../domain/users-management/RegistrationRequest.js"
import { Effect } from "effect/Effect"

export interface RegistrationRequestRepository extends Repository<Email, RegistrationRequest> {
  add(entity: RegistrationRequest): Effect<void, DuplicateIdError>
  update(entity: RegistrationRequest): Effect<void, NotFoundError>
}
