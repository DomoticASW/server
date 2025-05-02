import { Repository } from "../Repository.js"
import { TaskId } from "../../domain/scripts/Script.js";
import { TaskLists } from "../../domain/permissions-management/TaskLists.js";

export type TaskListsRepository = Repository<TaskId, TaskLists>;