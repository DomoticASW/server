import { TaskId } from "../scripts-management/Script.js";
import { Email } from "../users-management/User.js";

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
  return new TaskListsImpl(id, blacklist, whitelist);
}

class TaskListsImpl implements TaskLists {
  readonly id: TaskId;

  private _blacklist: Email[];
  private _whitelist: Email[];

  constructor(id: TaskId, blacklist: Email[], whitelist: Email[]) {
    this.id = id;
    this._blacklist = blacklist;
    this._whitelist = whitelist;
  }
  
  get blacklist(): Email[] {
    return [...this._blacklist];
  }
  get whitelist(): Email[] {
    return [...this._whitelist];
  }

  addEmailToBlacklist(email: Email): void {
    if (!this._blacklist.includes(email) && !this._whitelist.includes(email)) {
      this._blacklist.push(email);
    }
  }
  addEmailToWhitelist(email: Email): void {
    if (!this._whitelist.includes(email) && !this._blacklist.includes(email)) {
      this._whitelist.push(email);
    }
  }
  removeEmailFromBlacklist(email: Email): void {
    const index = this._blacklist.indexOf(email);
    if (index >= 0) {
      this._blacklist.splice(index, 1);
    }
  }
  removeEmailFromWhitelist(email: Email): void {
    const index = this._whitelist.indexOf(email);
    if (index >= 0) {
      this._whitelist.splice(index, 1);
    }
  }
}