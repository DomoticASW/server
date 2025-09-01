import { Effect, pipe } from "effect"
import { Email } from "../../domain/users-management/User.js"
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js"
import mongoose from "mongoose"
import { flatMap, orDie, tryPromise } from "effect/Effect"
import { TaskLists } from "../../domain/permissions-management/TaskLists.js"
import { TaskId } from "../../domain/scripts-management/Script.js"
import { TaskListsRepository } from "../../ports/permissions-management/TaskListsRepository.js"

export interface TaskListsSchema {
  _id: string
  blacklist: string[]
  whitelist: string[]
}

export class TaskListsRepositoryMongoAdapter implements TaskListsRepository {
  private taskListsSchema = new mongoose.Schema<TaskListsSchema>({
    _id: { type: String, required: true },
    blacklist: { type: [String], required: true },
    whitelist: { type: [String], required: true },
  })

  private tasks: mongoose.Model<TaskListsSchema>

  constructor(connection: mongoose.Connection) {
    this.tasks = connection.model<TaskListsSchema>("TaskLists", this.taskListsSchema, undefined, {
      overwriteModels: true,
    })
  }

  add(entity: TaskLists): Effect.Effect<void, DuplicateIdError> {
    return tryPromise({
      try: async () => {
        const taskLists = new this.tasks({
          _id: entity.id,
          blacklist: entity.blacklist,
          whitelist: entity.whitelist,
        })
        await taskLists.save()
      },
      catch: () => DuplicateIdError(),
    })
  }

  update(entity: TaskLists): Effect.Effect<void, NotFoundError> {
    const promise = async () =>
      await this.tasks.findByIdAndUpdate(
        entity.id,
        { blacklist: entity.blacklist, whitelist: entity.whitelist },
        { new: true }
      )
    return pipe(
      tryPromise(promise),
      orDie,
      flatMap((taskLists) => {
        if (taskLists) {
          return Effect.succeed(null)
        } else {
          return Effect.fail(NotFoundError())
        }
      })
    )
  }

  remove(id: TaskId): Effect.Effect<void, NotFoundError> {
    const promise = async () => await this.tasks.findByIdAndDelete(id)
    return pipe(
      tryPromise(promise),
      orDie,
      flatMap((taskLists) => {
        if (taskLists) {
          return Effect.succeed(null)
        } else {
          return Effect.fail(NotFoundError())
        }
      })
    )
  }

  getAll(): Effect.Effect<Iterable<TaskLists>, never> {
    return tryPromise(async () => {
      const tasks = await this.tasks.find()
      return tasks.map((taskLists) => this.toEntity(taskLists))
    }).pipe(orDie)
  }

  find(id: TaskId): Effect.Effect<TaskLists, NotFoundError> {
    const promise = async () => this.tasks.findById(id)
    return pipe(
      tryPromise(promise),
      orDie,
      flatMap((taskLists) => {
        if (taskLists) {
          return Effect.succeed(this.toEntity(taskLists))
        } else {
          return Effect.fail(NotFoundError())
        }
      })
    )
  }

  toEntity(taskLists: TaskListsSchema): TaskLists {
    return TaskLists(
      TaskId(taskLists._id),
      taskLists.blacklist.map((user) => Email(user)),
      taskLists.whitelist.map((user) => Email(user))
    )
  }
}
