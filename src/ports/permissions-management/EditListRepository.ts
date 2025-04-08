<<<<<<< HEAD:src/ports/permissions-management/EditListRepository.ts
import { ScriptId } from "../../domain/scripts/Script.js";
import { EditList } from "../../domain/permissions-management/EditList.js";
=======
import { ScriptId } from "../../domain/scripts-management/Script.js";
import { EditList } from "../../domain/permissions/EditList.js";
>>>>>>> a9fd43e (chore: changed names of packages of scripts into scripts-management):src/ports/permissions/EditListRepository.ts
import { Repository } from "../Repository.js"

export type EditListRepository = Repository<ScriptId, EditList>;