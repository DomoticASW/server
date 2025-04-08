import mongoose from "mongoose";
import { DeviceOfflineNotificationSubscriptionRepositoryMongoadapter } from "../../../src/adapters/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Effect, pipe } from "effect";
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../../src/ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { DeviceId } from "../../../src/domain/devices-management/Device.js";
import { Email } from "../../../src/domain/users-management/User.js";

const dbName: string = "DeviceOfflineNotificationSubscriptionRepositoryTests"
let dbConnection: mongoose.Connection
let repo: DeviceOfflineNotificationSubscriptionRepository
let notification: DeviceOfflineNotificationSubscription

beforeAll(async () => {
  dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
  repo = new DeviceOfflineNotificationSubscriptionRepositoryMongoadapter(dbConnection);
  notification = DeviceOfflineNotificationSubscription(Email("email@email.com"), DeviceId("1"))
});

beforeEach(async () => {
  const collections = await dbConnection.listCollections()
  await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)))

  repo = new DeviceOfflineNotificationSubscriptionRepositoryMongoadapter(dbConnection);
});

test("The repository is initially empty", async () => {
  const notifications = await Effect.runPromise(repo.getAll()) 
  expect(notifications).toHaveLength(0)
});

test("A DeviceOfflineNotificationSubscription can be added to the repository", async () => {
  await Effect.runPromise(repo.add(notification));
  const notifications = await Effect.runPromise(repo.getAll());
  expect(notifications).toHaveLength(1);
  expect(notifications).toContainEqual(notification);
});

test("Cannot add to the repository two notification with same id", async () => {
  await Effect.runPromise(repo.add(notification));
  await pipe(
      repo.add(notification),
      Effect.match({
          onSuccess() { },
          onFailure(err) { expect(err.__brand).toBe("DuplicateIdError") }
      }),
      Effect.runPromise
  );

  const notifications = await Effect.runPromise(repo.getAll());
  expect(notifications).toContainEqual(notification);
  expect(notifications).toHaveLength(1);
});

test("A notification can be found on the repository", async () => {
  await Effect.runPromise(repo.add(notification));
  const result = await Effect.runPromise(repo.find(notification));

  expect(result).toStrictEqual(notification);
});

test("If a notification does not exists on the db sends an error when trying to find it", async () => {
  await pipe(
    repo.find(notification),
    Effect.match({
        onSuccess() { },
        onFailure(err) { expect(err.__brand).toBe("NotFoundError") }
    }),
    Effect.runPromise
  );
});

test("Update does nothing if the entity is present", async () => {
  await Effect.runPromise(repo.add(notification));
  await Effect.runPromise(repo.update(notification));

  const res = await Effect.runPromise(repo.find(notification))
  expect(res).toStrictEqual(res)
});

test("Update returns an error if the entity is not present", async () => {
  await pipe(
    repo.update(notification),
    Effect.match({
      onSuccess() {},
      onFailure(error) {
        expect(error.__brand).toBe("NotFoundError");
      },
    }),
    Effect.runPromise
  );
});

test("Remove a notification from the repo if present", async () => {
  await Effect.runPromise(repo.add(notification));
  await Effect.runPromise(repo.remove(notification));

  const res = await Effect.runPromise(repo.getAll())
  expect(res).toHaveLength(0)
});

test("Trying to remove a notification from the repo if not present returns an error", async () => {
  await pipe(
    repo.remove(notification),
    Effect.match({
      onSuccess() {},
      onFailure(error) {
        expect(error.__brand).toBe("NotFoundError");
      },
    }),
    Effect.runPromise
  );
});

afterAll(async () => {
  await dbConnection.close()
})