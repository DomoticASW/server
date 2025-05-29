import { Effect, pipe } from "effect";
import { DeviceId } from "../../domain/devices-management/Device.js";
import { UserDevicePermission } from "../../domain/permissions-management/UserDevicePermission.js";
import { Email } from "../../domain/users-management/User.js";
import { UserDevicePermissionRepository } from "../../ports/permissions-management/UserDevicePermissionRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";
import { flatMap, orDie, succeed, fail, tryPromise } from "effect/Effect";

export interface UserDevicePermissionSchema {
  email: string
  deviceId: string,
}

export class UserDevicePermissionRepositoryMongoAdapter implements UserDevicePermissionRepository {

  private userDevicePermissionSchema = new mongoose.Schema<UserDevicePermissionSchema>({
    email: { type: String, required: true },
    deviceId: { type: String, required: true },
  });

  private permissions: mongoose.Model<UserDevicePermissionSchema>

  constructor(connection: mongoose.Connection) {
    this.permissions = connection.model<UserDevicePermissionSchema>("UserDevicePermission", this.userDevicePermissionSchema, undefined, { overwriteModels: true });
  }

  add(entity: UserDevicePermission): Effect.Effect<void, DuplicateIdError> {
    return tryPromise({
      try: async () => {
        const permission = new this.permissions({ email: entity.email, deviceId: entity.deviceId });
        await permission.save();
      },
      catch: () => DuplicateIdError(),
    });
  }

  update(entity: UserDevicePermission): Effect.Effect<void, NotFoundError> {
    return tryPromise({
      try: async () => {
        const permission = await this.permissions.findOne({email: entity.email, deviceId: entity.deviceId});
        if (!permission) {
          throw NotFoundError();
        }
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  remove(id: [Email, DeviceId]): Effect.Effect<void, NotFoundError> {
    const promise = async () => await this.permissions.findOneAndDelete({email: id[0], deviceId: id[1]})
    return pipe(
      tryPromise(promise),
      orDie,
      flatMap(permission => {
        if (permission) {
          return succeed(null);
        } else {
          return fail(NotFoundError());
        }
      })
    )
  }
  getAll(): Effect.Effect<Iterable<UserDevicePermission>, never> {
    return tryPromise(async () => {
      const permissions = await this.permissions.find();
      return permissions.map(permission => this.toEntity(permission))
    }).pipe(orDie);
  }

  find(id: [Email, DeviceId]): Effect.Effect<UserDevicePermission, NotFoundError, never> {
    const promise = async () => this.permissions.findOne({email: id[0], deviceId: id[1]});
    return pipe(
      tryPromise(promise),
      orDie,
      flatMap(permission => {
        if (permission) {
          return succeed(this.toEntity(permission));
        } else {
          return fail(NotFoundError());
        }
      })
    )
  }

  toEntity(permission: UserDevicePermissionSchema): UserDevicePermission {
    return UserDevicePermission(Email(permission.email), DeviceId(permission.deviceId))
  }
}