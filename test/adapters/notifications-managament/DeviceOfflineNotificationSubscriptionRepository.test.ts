import mongoose from "mongoose";
import { DeviceOfflineNotificationSubscriptionRepositoryMongoadapter } from "../../../src/adapters/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Effect, pipe } from "effect";
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../../src/ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";

const dbName: string = "DeviceOfflineNotificationSubscriptionRepositoryTests"
let dbConnection: mongoose.Connection
let repo: DeviceOfflineNotificationSubscriptionRepository

beforeAll(async () => {
  dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
  repo = new DeviceOfflineNotificationSubscriptionRepositoryMongoadapter(dbConnection);
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
  const notification = DeviceOfflineNotificationSubscription("email@email.com", "1");

  await Effect.runPromise(repo.add(notification));
  const notifications = await Effect.runPromise(repo.getAll());
  expect(notifications).toHaveLength(1);
  expect(notifications).toContainEqual(notification);
});

test("Cannot add to the repository two notification with same id", async () => {
  const notification = DeviceOfflineNotificationSubscription("email@email.com", "1")

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
  const notification = DeviceOfflineNotificationSubscription("email@email.com", "1")

  await Effect.runPromise(repo.add(notification));
  const result = await Effect.runPromise(repo.find(notification));

  expect(result).toStrictEqual(notification);
});

test("If a notification does not exists on the db sends an error", async () => {
  const notification = DeviceOfflineNotificationSubscription("email@email.com", "1")

  await pipe(
    repo.find(notification),
    Effect.match({
        onSuccess() { },
        onFailure(err) { expect(err.__brand).toBe("NotFoundError") }
    }),
    Effect.runPromise
  );
});

afterAll(async () => {
  await dbConnection.close()
})