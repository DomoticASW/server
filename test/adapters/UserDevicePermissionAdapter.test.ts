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
  const notifications = await Effect.runPromise(repo.getAll()) 
  expect(notifications).toHaveLength(0)
});


test("Try to add UserDevicePermission", async () => {
  await Effect.runPromise(repo.add(permission));
  const notifications = await Effect.runPromise(repo.getAll());
  expect(notifications).toHaveLength(1);
  expect(notifications).toContainEqual(permission);
});

afterAll(async () => {
  await dbConnection.close()
})