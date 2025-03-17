import { TaskId } from "../scripts/Task.js";
import { Email } from "../users-management/User.js";

export interface TaskList {
  readonly id: TaskId

  blacklist: Email[]
  whitelist: Email[]
}