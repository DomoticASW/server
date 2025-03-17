import { ScriptId } from "../scripts/Script.js";
import { UserId } from "../users-management/User.js";

export interface EditList {
  readonly id: ScriptId

  users: UserId[]
}