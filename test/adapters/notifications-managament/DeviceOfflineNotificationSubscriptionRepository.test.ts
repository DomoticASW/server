import mongoose from "mongoose";
import { DeviceOfflineNotificationSubscriptionRepositoryMongoadapter } from "../../../src/adapters/notifications-management/DeviceOfflineNotificationSubscription.js";
import { Effect } from "effect";
import { DeviceOfflineNotificationSubscription } from "../../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js";

const dbName: string = "DeviceOfflineNotificationSubscriptionRepositoryTests"

const dbConnection: mongoose.Connection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
const repo = new DeviceOfflineNotificationSubscriptionRepositoryMongoadapter(dbConnection);

test("The repository is initially empty", async () => {
  const notifications = await Effect.runPromise(repo.getAll()) 
  expect(notifications).toHaveLength(0)
});

test("A DeviceOfflineNotificationSubscription can be add to the repository", async () => {
  const notification = DeviceOfflineNotificationSubscription("email@email.com", "1")

  await Effect.runPromise(repo.add(notification))
  const notifications = await Effect.runPromise(repo.getAll())
  expect(notification).toHaveLength(1)
  expect(notifications).toContain(notification)
});