import { Repository } from "../Repository.js"
import { TaskId } from "../../domain/scripts-management/Script.js";
import { TaskLists } from "../../domain/permissions/TaskLists.js";

export type TaskListRepository = Repository<TaskId, TaskLists>;