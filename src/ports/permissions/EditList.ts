import { ScriptId } from "../scripts/Script.js";
import { Email } from "../users-management/User.js";

export interface EditList {
  readonly id: ScriptId

  users: Email[]
}