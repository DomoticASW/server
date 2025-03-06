import { Repository } from "../repository/Repository.js";
import { Script, ScriptId } from "./Script.js";

export type ScriptRepository = Repository<ScriptId, Script<ScriptId>>