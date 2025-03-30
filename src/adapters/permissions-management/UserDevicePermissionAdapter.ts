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
          const notification = new this.permissions({email: entity.email, deviceId: entity.deviceId});
          await notification.save();
      },
      catch: () => DuplicateIdError(),
  });
  }

  update(entity: UserDevicePermission): Effect.Effect<void, NotFoundError> {
    throw new Error("Method not implemented.");
  }
  remove(entity: UserDevicePermission): Effect.Effect<void, NotFoundError> {
    throw new Error("Method not implemented.");
  }
  getAll(): Effect.Effect<Iterable<UserDevicePermission>, never> {
    return tryPromise(async () => {
      const notifications = await this.permissions.find();
      return notifications.map(permission => this.toEntity(permission))
    }).pipe(orDie);
  }
  find(id: [Email, DeviceId]): Effect.Effect<UserDevicePermission, NotFoundError> {
    throw new Error("Method not implemented.");
  }
  
  toEntity(permission: UserDevicePermissionSchema): UserDevicePermission {
    return UserDevicePermission(Email(permission.email), DeviceId(permission.deviceId))
  }
}