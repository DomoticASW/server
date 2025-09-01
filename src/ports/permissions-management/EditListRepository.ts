import { ScriptId } from "../../domain/scripts-management/Script.js"
import { EditList } from "../../domain/permissions-management/EditList.js"
import { DuplicateIdError, NotFoundError, Repository } from "../Repository.js"
import { Effect } from "effect/Effect"

export interface EditListRepository extends Repository<ScriptId, EditList> {
  add(entity: EditList): Effect<void, DuplicateIdError>
  update(entity: EditList): Effect<void, NotFoundError>
}
