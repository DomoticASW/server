import { TaskId } from "../scripts-management/Script.js"
import { Email } from "../users-management/User.js"

export interface TaskLists {
  readonly id: TaskId

  blacklist: Email[]
  whitelist: Email[]

  addEmailToBlacklist(email: Email): void
  addEmailToWhitelist(email: Email): void
  removeEmailFromBlacklist(email: Email): void
  removeEmailFromWhitelist(email: Email): void
}

export function TaskLists(id: TaskId, blacklist: Email[], whitelist: Email[]): TaskLists {
  return new TaskListsImpl(id, blacklist, whitelist)
}

class TaskListsImpl implements TaskLists {
  readonly id: TaskId

  readonly blacklist: Email[]
  readonly whitelist: Email[]

  constructor(id: TaskId, blacklist: Email[], whitelist: Email[]) {
    this.id = id
    this.blacklist = blacklist
    this.whitelist = whitelist
  }

  addEmailToBlacklist(email: Email): void {
    if (!this.blacklist.includes(email) && !this.whitelist.includes(email)) {
      this.blacklist.push(email)
    }
  }
  addEmailToWhitelist(email: Email): void {
    if (!this.whitelist.includes(email) && !this.blacklist.includes(email)) {
      this.whitelist.push(email)
    }
  }
  removeEmailFromBlacklist(email: Email): void {
    const index = this.blacklist.indexOf(email)
    if (index >= 0) {
      this.blacklist.splice(index, 1)
    }
  }
  removeEmailFromWhitelist(email: Email): void {
    const index = this.whitelist.indexOf(email)
    if (index >= 0) {
      this.whitelist.splice(index, 1)
    }
  }
}
