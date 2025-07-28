import mongoose from "mongoose"
import { Effect } from "effect"
import { UserRepository } from "../../../src/ports/users-management/UserRepository.js"
import { Email, Nickname, PasswordHash, Role, User } from "../../../src/domain/users-management/User.js"
import { UserRepositoryAdapter } from "../../../src/adapters/users-management/UserRepositoryAdapter.js"
import bcrypt from "bcrypt"

const dbName: string = "UserRepositoryTests"
let dbConnection: mongoose.Connection
let repo: UserRepository
let user: User

beforeAll(async () => {
    dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise()
    repo = new UserRepositoryAdapter(dbConnection)
    const password = "password";
    const hashedPassword = await bcrypt.hash(password, 10);
    user = User(Nickname("Ciccio"), Email("ciao@gmail.com"), PasswordHash(hashedPassword), "Admin" as Role);
});

beforeEach(async () => {
    const collections = await dbConnection.listCollections()
    await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)))
    
    repo = new UserRepositoryAdapter(dbConnection)
});

test("The repository is initially empty", async () => {
    const users = await Effect.runPromise(repo.getAll())
    expect(users).toHaveLength(0)
});

test("Try to add a User", async () => {
    await Effect.runPromise(repo.add(user))
    const users = await Effect.runPromise(repo.getAll())
    expect(users).toHaveLength(1)
    expect(users).toContainEqual(user)
});

test("Try to add a User with the same email", async () => {
    await Effect.runPromise(repo.add(user));
    await expect(Effect.runPromise(repo.add(user)))
      .rejects.toThrow("DuplicateIdError");
});

test("Try to find a User", async () => {
    await Effect.runPromise(repo.add(user))
    const result = await Effect.runPromise(repo.find(user.email))
    expect(result).toEqual(user)
});

test("Try to find a User that doesn't exist", async () => {
    await Effect.runPromise(repo.add(user))
    await expect(Effect.runPromise(repo.find(Email(""))))
        .rejects.toThrow("NotFoundError");
});

test("Try to update a User", async () => {
    const password = "password1";
    const hashedPassword = await bcrypt.hash(password, 10);
    const user2 = User(Nickname("Fra"), Email("ciao@gmail.com"), PasswordHash(hashedPassword), "User" as Role);

    await Effect.runPromise(repo.add(user));
    await Effect.runPromise(repo.update(user2));
    
    const res = await Effect.runPromise(repo.find(user.email))
    expect(res).toStrictEqual(user2)
});

test("Try to update a User that doesn't exist", async () => {
    const password = "password1";
    const hashedPassword = await bcrypt.hash(password, 10);
    const user2 = User(Nickname("Fra"), Email(""), PasswordHash(hashedPassword), "User" as Role);

    await Effect.runPromise(repo.add(user));
    await expect(Effect.runPromise(repo.update(user2)))
        .rejects.toThrow("NotFoundError");
});

test("Try to remove a user", async () => {
    await Effect.runPromise(repo.add(user));
    const res1 = await Effect.runPromise(repo.getAll())
    expect(res1).toHaveLength(1)
    await Effect.runPromise(repo.remove(user.email));
    const res2 = await Effect.runPromise(repo.getAll())
    expect(res2).toHaveLength(0)
});

test("Try to remove a user that doesn't exist", async () => {
    await Effect.runPromise(repo.add(user));
    const res1 = await Effect.runPromise(repo.getAll())
    expect(res1).toHaveLength(1)
    await expect(Effect.runPromise(repo.remove(Email(""))))
        .rejects.toThrow("NotFoundError");
    const res2 = await Effect.runPromise(repo.getAll())
    expect(res2).toHaveLength(1)
});

afterAll(async () => {
    await dbConnection.close()
});
