import mongoose from "mongoose"
import { Effect } from "effect"
import { TaskId } from "../../../src/domain/scripts/Script.js"
import { TaskListsRepository } from "../../../src/ports/permissions-management/TaskListsRepository.js"
import { TaskListsRepositoryMongoAdapter } from "../../../src/adapters/permissions-management/TaskListsRepositoryMongoAdapter.js"
import { TaskLists } from "../../../src/domain/permissions-management/TaskLists.js"
import { Email } from "../../../src/domain/users-management/User.js"

const dbName: string = "TaskListsRepositoryTests"
let dbConnection: mongoose.Connection
let repo: TaskListsRepository
let taskLists: TaskLists

beforeAll(async () => {
  dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
  repo = new TaskListsRepositoryMongoAdapter(dbConnection);
  taskLists = TaskLists(TaskId("1"), [], [])
});

beforeEach(async () => {
  const collections = await dbConnection.listCollections()
  await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)))

  repo = new TaskListsRepositoryMongoAdapter(dbConnection);
});

test("The repository is initially empty", async () => {
  const tasks = await Effect.runPromise(repo.getAll()) 
  expect(tasks).toHaveLength(0)
});


test("Try to add TaskLists", async () => {
  await Effect.runPromise(repo.add(taskLists));
  const tasks = await Effect.runPromise(repo.getAll());
  expect(tasks).toHaveLength(1);
  expect(tasks).toContainEqual(taskLists);
});

test("Try to find a TaskLists", async () => {
  await Effect.runPromise(repo.add(taskLists));
  const result = await Effect.runPromise(repo.find(taskLists.id));
  expect(result).toEqual(taskLists);
});

test("Try to update blacklist in TaskLists", async () => {
  const user1 = Email("user1")
  await Effect.runPromise(repo.add(taskLists));
  taskLists.addEmailToBlacklist(user1)
  await Effect.runPromise(repo.update(taskLists));

  const res = await Effect.runPromise(repo.find(taskLists.id));
  expect(res.blacklist).toHaveLength(1)
  expect(res.whitelist).toHaveLength(0)
  taskLists.removeEmailFromBlacklist(user1)
})

test("Try to update whitelist in TaskLists", async () => {
  await Effect.runPromise(repo.add(taskLists));
  taskLists.addEmailToWhitelist(Email("user1"))
  taskLists.addEmailToWhitelist(Email("user2"))
  await Effect.runPromise(repo.update(taskLists));

  const res = await Effect.runPromise(repo.find(taskLists.id));
  expect(res.blacklist).toHaveLength(0)
  expect(res.whitelist).toHaveLength(2)
})

test("Try to remove a TaskLists", async () => {
  await Effect.runPromise(repo.add(taskLists));
  const res1 = await Effect.runPromise(repo.getAll())
  expect(res1).toHaveLength(1)
  await Effect.runPromise(repo.remove(taskLists.id));
  const res2 = await Effect.runPromise(repo.getAll())
  expect(res2).toHaveLength(0)
})

afterAll(async () => {
  await dbConnection.close()
})