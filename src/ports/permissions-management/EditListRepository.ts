import { EditList } from "../../domain/permissions-management/EditList.js";
import { ScriptId } from "../../domain/scripts-management/Script.js";
import { Repository } from "../Repository.js"

export type EditListRepository = Repository<ScriptId, EditList>;