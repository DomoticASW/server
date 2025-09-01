import { ScriptId } from "../scripts-management/Script.js"
import { Email } from "../users-management/User.js"

export interface EditList {
  readonly id: ScriptId

  users: Email[]

  addUserToUsers(user: Email): void
  removeUserToUsers(user: Email): void
}

export function EditList(id: ScriptId, users: Email[]): EditList {
  return new EditListImpl(id, users)
}

class EditListImpl implements EditList {
  readonly id: ScriptId

  readonly users: Email[]

  constructor(id: ScriptId, users: Email[]) {
    this.id = id
    this.users = users
  }

  addUserToUsers(user: Email): void {
    if (!this.users.includes(user)) {
      this.users.push(user)
    }
  }

  removeUserToUsers(user: Email): void {
    const index = this.users.indexOf(user)
    if (index >= 0) {
      this.users.splice(index, 1)
    }
  }
}
