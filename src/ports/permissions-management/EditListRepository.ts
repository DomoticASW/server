import { ScriptId } from "../../domain/scripts/Script.js";
import { EditList } from "../../domain/permissions-management/EditList.js";
import { Repository } from "../Repository.js"

export type EditListRepository = Repository<ScriptId, EditList>;