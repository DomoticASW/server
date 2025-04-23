import { Repository } from "../Repository.js"
import { TaskId } from "../../domain/scripts-management/Script.js";
import { TaskLists } from "../../domain/permissions-management/TaskLists.js";

export type TaskListsRepository = Repository<TaskId, TaskLists>;