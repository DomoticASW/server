import { Effect } from "effect";
import { Email } from "../../domain/users-management/User.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";
import { orDie, tryPromise } from "effect/Effect";
import { TaskLists } from "../../domain/permissions/TaskLists.js";
import { TaskId } from "../../domain/scripts/Script.js";
import { TaskListsRepository } from "../../ports/permissions/TaskListsRepository.js";

export interface TaskListsSchema {
  _id: string,
  blacklist: string[],
  whitelist: string[],
}

export class TaskListsMongoAdapter implements TaskListsRepository {

  private taskListsSchema = new mongoose.Schema<TaskListsSchema>({
    _id: { type: String, required: true },
    blacklist: { type: [String], required: true },
    whitelist: { type: [String], required: true },

  });

  private tasks: mongoose.Model<TaskListsSchema>

  constructor(connection: mongoose.Connection) {
    this.tasks = connection.model<TaskListsSchema>("TaskLists", this.taskListsSchema, undefined, { overwriteModels: true });
  }

  add(entity: TaskLists): Effect.Effect<void, DuplicateIdError> {
    return tryPromise({
      try: async () => {
        const taskLists = new this.tasks({ _id: entity.id, blacklist: entity.blacklist, whitelist: entity.whitelist });
        await taskLists.save();
      },
      catch: () => DuplicateIdError(),
    });
  }

  update(entity: TaskLists): Effect.Effect<void, NotFoundError> {
    return tryPromise({
      try: async () => {
        const taskLists = await this.tasks.findByIdAndUpdate(entity.id, { blacklist: entity.blacklist, whitelist: entity.whitelist }, { new: true });
        if (!taskLists) {
          throw NotFoundError();
        }
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  remove(id: TaskId): Effect.Effect<void, NotFoundError> {
    return tryPromise({
      try: async () => {
        const taskLists = await this.tasks.findByIdAndDelete(id);
        if (!taskLists) {
          throw NotFoundError();
        }
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  getAll(): Effect.Effect<Iterable<TaskLists>, never> {
    return tryPromise(async () => {
      const tasks = await this.tasks.find();
      return tasks.map(taskLists => this.toEntity(taskLists))
    }).pipe(orDie);
  }

  find(id: TaskId): Effect.Effect<TaskLists, NotFoundError> {
    const promise = this.tasks.findById(id);
    return tryPromise({
      try: async () => {
        const taskLists = await promise;
        if (!taskLists) {
          throw NotFoundError();
        }
        return this.toEntity(taskLists);
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  toEntity(taskLists: TaskListsSchema): TaskLists {
    return TaskLists(TaskId(taskLists._id), taskLists.blacklist.map(user => Email(user)), taskLists.whitelist.map(user => Email(user)));
  }
}