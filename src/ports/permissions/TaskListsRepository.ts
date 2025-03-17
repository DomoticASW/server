import { Repository } from "../Repository.js"
import { TaskId } from "../scripts/Task.js";
import { TaskList } from "./TaskLists.js";

export type TaskListRepository = Repository<TaskId, TaskList>;