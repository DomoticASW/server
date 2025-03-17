import { TaskId } from "../scripts/Task.js";
import { UserId } from "../users-management/User.js";

export interface TaskList {
  readonly id: TaskId

  blacklist: UserId[]
  whitelist: UserId[]
}