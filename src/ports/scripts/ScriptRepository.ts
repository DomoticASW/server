import { Repository } from "../Repository.js";
import { Script, ScriptId } from "../../domain/scripts/Script.js";

export type ScriptRepository = Repository<ScriptId, Script<ScriptId>>