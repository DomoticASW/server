import mongoose from "mongoose"
import { RegistrationRequestRepository } from "../../../src/ports/users-management/RegistrationRequestRepository.js"
import { RegistrationRequest } from "../../../src/domain/users-management/RegistrationRequest.js"
import { RegistrationRequestRepositoryAdapter } from "../../../src/adapters/users-management/RegistrationRequestRepositoryAdapter.js"
import { Email, Nickname, PasswordHash } from "../../../src/domain/users-management/User.js"
import { Effect } from "effect"

const dbName: string = "RegistrationRequestRepositoryTests"
let dbConnection: mongoose.Connection
let repo: RegistrationRequestRepository
let registrationRequest: RegistrationRequest

beforeAll(async () => {
    dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
    repo = new RegistrationRequestRepositoryAdapter(dbConnection);
    registrationRequest = RegistrationRequest(Nickname("Ciccio"), Email("ciao@gmail.com"), PasswordHash("passwordHash"));
});

beforeEach(async () => {
    const RR = await dbConnection.listCollections()
    await Promise.all(RR.map(c => dbConnection.dropCollection(c.name)))
    
    repo = new RegistrationRequestRepositoryAdapter(dbConnection);
});

test("The repository is initially empty", async () => {
    const RR = await Effect.runPromise(repo.getAll()) 
    expect(RR).toHaveLength(0)
});

test("Try to add a RegistrationRequest", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    const RR = await Effect.runPromise(repo.getAll());
    expect(RR).toHaveLength(1);
    expect(RR).toContainEqual(registrationRequest);
});

test("Try to add a User with the same email", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    await expect(Effect.runPromise(repo.add(registrationRequest)))
      .rejects.toThrow("DuplicateIdError");
});

test("Try to find a RegistrationRequest", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    const result = await Effect.runPromise(repo.find(Email("ciao@gmail.com")));
    expect(result).toEqual(registrationRequest);
});

test("Try to find a RegistrationRequest that doesn't exist", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    await expect(Effect.runPromise(repo.find(Email(""))))
        .rejects.toThrow("NotFoundError");
});

test("Try to update a RegistrationRequest", async () => {
    const RR = RegistrationRequest(Nickname("Fra"), Email("ciao@gmail.com"), PasswordHash("password"));

    await Effect.runPromise(repo.add(registrationRequest));
    await Effect.runPromise(repo.update(RR));
    
    const res = await Effect.runPromise(repo.find(registrationRequest.email))
    expect(res).toStrictEqual(RR)
})

test("Try to update a RegistrationRequest that doesn't exist", async () => {
    const RR = RegistrationRequest(Nickname("Fra"), Email(""), PasswordHash("password"));

    await Effect.runPromise(repo.add(registrationRequest));
    await expect(Effect.runPromise(repo.update(RR)))
        .rejects.toThrow("NotFoundError");
})

test("Try to remove a RegistrationRequest", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    const res1 = await Effect.runPromise(repo.getAll())
    expect(res1).toHaveLength(1)
    await Effect.runPromise(repo.remove(registrationRequest.email));
    const res2 = await Effect.runPromise(repo.getAll())
    expect(res2).toHaveLength(0)
})

test("Try to remove a RegistrationRequest that doesn't exist", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    const res1 = await Effect.runPromise(repo.getAll())
    expect(res1).toHaveLength(1)
    await expect(Effect.runPromise(repo.remove(Email(""))))
        .rejects.toThrow("NotFoundError");
    const res2 = await Effect.runPromise(repo.getAll())
    expect(res2).toHaveLength(1)
})

afterAll(async () => {
    await dbConnection.close()
})
