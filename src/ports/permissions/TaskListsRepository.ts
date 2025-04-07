import { Repository } from "../Repository.js"
import { TaskId } from "../../domain/scripts/Script.js";
import { TaskLists } from "../../domain/permissions/TaskLists.js";

export type TaskListRepository = Repository<TaskId, TaskLists>;