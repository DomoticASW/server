import { ScriptId } from "../scripts/Script.js";
import { EditList } from "./EditList.js";
import { Repository } from "../Repository.js"

export type EditListRepository = Repository<ScriptId, EditList>;