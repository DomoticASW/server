import { Effect, pipe } from "effect";
import { Email } from "../../domain/users-management/User.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";
import { orDie, tryPromise } from "effect/Effect";
import { EditList } from "../../domain/permissions-management/EditList.js";
import { EditListRepository } from "../../ports/permissions-management/EditListRepository.js";
import { ScriptId, TaskId } from "../../domain/scripts-management/Script.js";

export interface EditListSchema {
  _id: string,
  users: string[],
}

export class EditListRepositoryMongoAdapter implements EditListRepository {

  private editListSchema = new mongoose.Schema<EditListSchema>({
    _id: { type: String, required: true },
    users: { type: [String], required: true },
  });

  private editLists: mongoose.Model<EditListSchema>

  constructor(connection: mongoose.Connection) {
    this.editLists = connection.model<EditListSchema>("EditList", this.editListSchema, undefined, { overwriteModels: true });
  }

  add(entity: EditList): Effect.Effect<void, DuplicateIdError> {
    return tryPromise({
      try: async () => {
        const editList = new this.editLists({ _id: entity.id, users: entity.users });
        await editList.save();
      },
      catch: () => DuplicateIdError(),
    });
  }

  update(entity: EditList): Effect.Effect<void, NotFoundError> {
    const promise = async () => await this.editLists.findByIdAndUpdate(entity.id, { users: entity.users }, { new: true });
    return pipe(
      tryPromise(promise),
      orDie,
      Effect.flatMap(editList => {
        if (editList) {
          return Effect.succeed(null);
        } else {
          return Effect.fail(NotFoundError());
        }
      })
    )
  }

  remove(id: ScriptId): Effect.Effect<void, NotFoundError> {
    const promise = async () => await this.editLists.findByIdAndDelete(id);
    return pipe(
      tryPromise(promise),
      orDie,
      Effect.flatMap(editList => {
        if (editList) {
          return Effect.succeed(null);
        } else {
          return Effect.fail(NotFoundError());
        }
      })
    )
  }

  getAll(): Effect.Effect<Iterable<EditList>, never> {
    return tryPromise(async () => {
      const editLists = await this.editLists.find();
      return editLists.map(editList => this.toEntity(editList))
    }).pipe(orDie);
  }

  find(id: ScriptId): Effect.Effect<EditList, NotFoundError> {
    const promise = async () => await this.editLists.findById(id);
    return pipe(
      tryPromise(promise),
      orDie,
      Effect.flatMap(editList => {
        if (editList) {
          return Effect.succeed(this.toEntity(editList));
        } else {
          return Effect.fail(NotFoundError());
        }
      })
    )
  }

  addUserToUsers(id: ScriptId, user: Email): Effect.Effect<EditList, NotFoundError> {
    const promise = this.editLists.findById(id);
    return tryPromise({
      try: async () => {
        const editListSchema = await promise;
        if (!editListSchema) {
          throw NotFoundError();
        }
        const editList = this.toEntity(editListSchema);
        editList.addUserToUsers(user);
        return editList;
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  addListToUsers(id: ScriptId, users: Email[]): Effect.Effect<EditList, NotFoundError> {
    const promise = this.editLists.findById(id);
    return tryPromise({
      try: async () => {
        const editListSchema = await promise;
        if (!editListSchema) {
          throw NotFoundError();
        }
        const editList = this.toEntity(editListSchema);
        users.forEach(editList.addUserToUsers);
        return editList;
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  removeUserToUsers(id: ScriptId, user: Email): Effect.Effect<EditList, NotFoundError> {
    const promise = this.editLists.findById(id);
    return tryPromise({
      try: async () => {
        const editListSchema = await promise;
        if (!editListSchema) {
          throw NotFoundError();
        }
        const editList = this.toEntity(editListSchema);
        editList.removeUserToUsers(user);
        return editList;
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  toEntity(editList: EditListSchema): EditList {
    return EditList(TaskId(editList._id), editList.users.map(user => Email(user)));
  }
}