import { Effect } from "effect";
import { DeviceId } from "../../domain/devices-management/Device.js";
import { UserDevicePermission } from "../../domain/permissions/UserDevicePermission.js";
import { Email } from "../../domain/users-management/User.js";
import { UserDevicePermissionRepository } from "../../ports/permissions/UserDevicePermissionRepository.js";
import { DuplicateIdError, NotFoundError } from "../../ports/Repository.js";
import mongoose from "mongoose";
import { orDie, tryPromise } from "effect/Effect";

export interface UserDevicePermissionSchema { 
  email: string
  deviceId: string,
}

export class UserDevicePermissionMongoAdapter implements UserDevicePermissionRepository {
  
  private userDevicePermissionSchema = new mongoose.Schema<UserDevicePermissionSchema>({
    email: { type: String, required: true },
    deviceId: { type: String, required: true },
  }); 

  private permissions = mongoose.Model<UserDevicePermissionSchema>

  constructor(connection: mongoose.Connection) {
    this.permissions = connection.model<UserDevicePermissionSchema>("UserDevicePermission", this.userDevicePermissionSchema);
  }

  add(entity: UserDevicePermission): Effect.Effect<void, DuplicateIdError> {
    return tryPromise({
      try: async () => {
          const permission = new this.permissions({email: entity.email, deviceId: entity.deviceId});
          await permission.save();
      },
      catch: () => DuplicateIdError(),
  });
  }

update(entity: UserDevicePermission): Effect.Effect<void, NotFoundError> {
    return tryPromise({
      try: async () => {
          const permission = await this.permissions.findById([entity.email, entity.deviceId], {email: entity.email, deviceId: entity.deviceId});
          if (!permission) {
              throw NotFoundError();
          }
      },
      catch: () => NotFoundError(),
    }).pipe(orDie);
  }

  remove(entity: UserDevicePermission): Effect.Effect<void, NotFoundError> {
    throw new Error("Method not implemented.");
  }
  getAll(): Effect.Effect<Iterable<UserDevicePermission>, never> {
    return tryPromise(async () => {
      const permissions = await this.permissions.find();
      return permissions.map(permission => this.toEntity(permission))
    }).pipe(orDie);
  }
  find(id: [Email, DeviceId]): Effect.Effect<UserDevicePermission, NotFoundError> {
    const promise = this.permissions.findById(id);
    return tryPromise({
      try: async () => {
          const permission = await promise;
          if (!permission) {
              throw NotFoundError();
          }
          return this.toEntity(permission);
        },
        catch: () => NotFoundError(),
    }).pipe(orDie);
  }
  
  toEntity(permission: UserDevicePermissionSchema): UserDevicePermission {
    return UserDevicePermission(Email(permission.email), DeviceId(permission.deviceId))
  }
}