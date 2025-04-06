import { ScriptId } from "../scripts/Script.js";
import { Email } from "../users-management/User.js";

export interface EditList {
  readonly id: ScriptId

  users: Email[]

  addUserToUsers(user: Email): void
  removeUserToUsers(user: Email): void
}

export function EditList(id: ScriptId): EditList {
  return new EditListImpl(id);
}

class EditListImpl implements EditList {
  readonly id: ScriptId;

  private _users: Email[];

  constructor(id: ScriptId) {
    this.id = id;
    this._users = [];
  }

  get users(): Email[] {
    return [...this._users];
  }

  addUserToUsers(user: Email): void {
    if (!this._users.includes(user)) {
      this._users.push(user);
    }
  }

  removeUserToUsers(user: Email): void {
    const index = this._users.indexOf(user);
    if (index >= 0) {
      this._users.splice(index, 1);
    }
  }
}