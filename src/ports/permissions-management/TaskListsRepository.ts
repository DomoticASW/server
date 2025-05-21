import { DuplicateIdError, NotFoundError, Repository } from "../Repository.js"
import { TaskId } from "../../domain/scripts-management/Script.js";
import { TaskLists } from "../../domain/permissions-management/TaskLists.js";
import { Effect } from "effect/Effect";

export interface TaskListsRepository extends Repository<TaskId, TaskLists> {
    add(entity: TaskLists): Effect<void, DuplicateIdError>
    update(entity: TaskLists): Effect<void, NotFoundError>
}