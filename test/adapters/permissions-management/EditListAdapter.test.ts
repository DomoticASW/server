import mongoose from "mongoose"
import { Effect } from "effect"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"
import { EditListRepository } from "../../../src/ports/permissions-management/EditListRepository.js"
import { EditListMongoAdapter } from "../../../src/adapters/permissions-management/EditListAdapter.js"
import { EditList } from "../../../src/domain/permissions-management/EditList.js"
import { Email } from "../../../src/domain/users-management/User.js"

const dbName: string = "EditListRepositoryTests"
let dbConnection: mongoose.Connection
let repo: EditListRepository
let editList: EditList

beforeAll(async () => {
  dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
  repo = new EditListMongoAdapter(dbConnection);
  editList = EditList(TaskId("1"), [])
});

beforeEach(async () => {
  const collections = await dbConnection.listCollections()
  await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)))

  repo = new EditListMongoAdapter(dbConnection);
});

test("The repository is initially empty", async () => {
  const editLists = await Effect.runPromise(repo.getAll()) 
  expect(editLists).toHaveLength(0)
});


test("Try to add EditList", async () => {
  await Effect.runPromise(repo.add(editList));
  const editLists = await Effect.runPromise(repo.getAll());
  expect(editLists).toHaveLength(1);
  expect(editLists).toContainEqual(editList);
});

test("Try to find an EditList", async () => {
  await Effect.runPromise(repo.add(editList));
  const result = await Effect.runPromise(repo.find(editList.id));
  expect(result).toEqual(editList);
});

test("Try to update an EditList", async () => {
  await Effect.runPromise(repo.add(editList));
  editList.addUserToUsers(Email("user1"))
  await Effect.runPromise(repo.update(editList));

  const res = await Effect.runPromise(repo.find(editList.id));
  expect(res.users).toHaveLength(1)
})

test("Try to remove an EditList", async () => {
  await Effect.runPromise(repo.add(editList));
  const res1 = await Effect.runPromise(repo.getAll())
  expect(res1).toHaveLength(1)
  await Effect.runPromise(repo.remove(editList.id));
  const res2 = await Effect.runPromise(repo.getAll())
  expect(res2).toHaveLength(0)
})

afterAll(async () => {
  await dbConnection.close()
})