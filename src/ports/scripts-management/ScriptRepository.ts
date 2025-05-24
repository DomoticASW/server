import { Repository } from "../Repository.js";
import { Script, ScriptId } from "../../domain/scripts-management/Script.js";

export type ScriptRepository = Repository<ScriptId, Script<ScriptId>>