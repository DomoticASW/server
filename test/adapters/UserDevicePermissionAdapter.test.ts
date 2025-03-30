import mongoose from "mongoose"
import { UserDevicePermissionRepository } from "../../src/ports/permissions/UserDevicePermissionRepository.js"
import { UserDevicePermission } from "../../src/domain/permissions/UserDevicePermission.js"
import { Email } from "../../src/domain/users-management/User.js"
import { DeviceId } from "../../src/domain/devices-management/Device.js"
import { UserDevicePermissionMongoAdapter } from "../../src/adapters/permissions-management/UserDevicePermissionAdapter.js"
import { Effect } from "effect"

const dbName: string = "UserDevicePermissionRepositoryTests"
let dbConnection: mongoose.Connection
let repo: UserDevicePermissionRepository
let permission: UserDevicePermission

beforeAll(async () => {
  dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
  repo = new UserDevicePermissionMongoAdapter(dbConnection);
  permission = UserDevicePermission(Email("marcoraggio@email.com"), DeviceId("1"))
});

beforeEach(async () => {
  const collections = await dbConnection.listCollections()
  await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)))

  repo = new UserDevicePermissionMongoAdapter(dbConnection);
});

test("The repository is initially empty", async () => {
  const permissions = await Effect.runPromise(repo.getAll()) 
  expect(permissions).toHaveLength(0)
});


test("Try to add UserDevicePermission", async () => {
  await Effect.runPromise(repo.add(permission));
  const permissions = await Effect.runPromise(repo.getAll());
  expect(permissions).toHaveLength(1);
  expect(permissions).toContainEqual(permission);
});

test("Try to find an UserDevicePermission", async () => {
  await Effect.runPromise(repo.add(permission));
  const result = await Effect.runPromise(repo.find([permission.email, permission.deviceId]));
  expect(result).toEqual(permission);
});

test("The entity cannot has changes", async () => {
  // That is because all the fields are readonly
  await Effect.runPromise(repo.add(permission));
  await Effect.runPromise(repo.update(permission));

  const res = await Effect.runPromise(repo.find([permission.email, permission.deviceId]))
  expect(res).toStrictEqual(res)
})

afterAll(async () => {
  await dbConnection.close()
})