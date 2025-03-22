import { Repository } from "../Repository.js"
import { TaskId } from "../scripts/Script.js";
import { TaskList } from "./TaskLists.js";

export type TaskListRepository = Repository<TaskId, TaskList>;