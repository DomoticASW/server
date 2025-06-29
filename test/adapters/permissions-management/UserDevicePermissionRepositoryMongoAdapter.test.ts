import mongoose from "mongoose"
import { Effect } from "effect"
import { UserDevicePermissionRepository } from "../../../src/ports/permissions-management/UserDevicePermissionRepository.js"
import { UserDevicePermission } from "../../../src/domain/permissions-management/UserDevicePermission.js"
import { UserDevicePermissionRepositoryMongoAdapter } from "../../../src/adapters/permissions-management/UserDevicePermissionRepositoryMongoAdapter.js"
import { Email } from "../../../src/domain/users-management/User.js"
import { DeviceId } from "../../../src/domain/devices-management/Device.js"

const dbName: string = "UserDevicePermissionRepositoryTests"
let dbConnection: mongoose.Connection
let repo: UserDevicePermissionRepository
let permission: UserDevicePermission

beforeAll(async () => {
  dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
  repo = new UserDevicePermissionRepositoryMongoAdapter(dbConnection);
  permission = UserDevicePermission(Email("marcoraggio@email.com"), DeviceId("1"))
});

beforeEach(async () => {
  const collections = await dbConnection.listCollections()
  await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)))

  repo = new UserDevicePermissionRepositoryMongoAdapter(dbConnection);
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
  expect(res).toStrictEqual(permission)
})

test("Try to find an UserDevicePermission that does not exist", async () => {
  await Effect.runPromise(repo.add(permission));
  await expect(
    Effect.runPromise(repo.find([Email(""), DeviceId("2")]))
  ).rejects.toThrow("NotFoundError")
});

test("Try to find an UserDevicePermission that has wrong deviceId", async () => {
  await Effect.runPromise(repo.add(permission));
  await expect(
    Effect.runPromise(repo.find([Email("marcoraggio@email.com"), DeviceId("2")]))
  ).rejects.toThrow("NotFoundError");
});

test("Try to remove an UserDevicePermission", async () => {
  await Effect.runPromise(repo.add(permission));
  const res1 = await Effect.runPromise(repo.getAll())
  expect(res1).toHaveLength(1)
  await Effect.runPromise(repo.remove([permission.email, permission.deviceId]));
  const res2 = await Effect.runPromise(repo.getAll())
  expect(res2).toHaveLength(0)
})

afterAll(async () => {
  await dbConnection.close()
})