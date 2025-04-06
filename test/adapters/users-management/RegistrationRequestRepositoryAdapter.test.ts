import mongoose from "mongoose"
import { RegistrationRequestRepository } from "../../../src/ports/users-management/RegistrationRequestRepository.js"
import { RegistrationRequest } from "../../../src/domain/users-management/RegistrationRequest.js"
import { RegistartionRequestRepositoryAdapter } from "../../../src/adapters/users-management/RegistrationRequestRepositoryAdapter.js"
import { Email, Nickname, PasswordHash } from "../../../src/domain/users-management/User.js"
import { Effect } from "effect"

const dbName: string = "RegistrationRequestRepositoryTests"
let dbConnection: mongoose.Connection
let repo: RegistrationRequestRepository
let registrationRequest: RegistrationRequest

beforeAll(async () => {
    dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
    repo = new RegistartionRequestRepositoryAdapter(dbConnection);
    registrationRequest = RegistrationRequest(Nickname("Ciccio"), Email("ciao@gmail.com"), PasswordHash("passwordHash"));
});

beforeEach(async () => {
    const RR = await dbConnection.listCollections()
    await Promise.all(RR.map(c => dbConnection.dropCollection(c.name)))
    
    repo = new RegistartionRequestRepositoryAdapter(dbConnection);
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

test("Try to find a RegistrationRequest", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    const result = await Effect.runPromise(repo.find(registrationRequest.email));
    expect(result).toEqual(registrationRequest);
});

test("Try to update a RegistrationRequest", async () => {
    const RR = RegistrationRequest(Nickname("Fra"), Email("ciao@gmail.com"), PasswordHash("password"));

    await Effect.runPromise(repo.add(registrationRequest));
    await Effect.runPromise(repo.update(RR));
    
    const res = await Effect.runPromise(repo.find(registrationRequest.email))
    expect(res).toStrictEqual(RR)
})

test("Try to remove a RegistrationRequest", async () => {
    await Effect.runPromise(repo.add(registrationRequest));
    const res1 = await Effect.runPromise(repo.getAll())
    expect(res1).toHaveLength(1)
    await Effect.runPromise(repo.remove(registrationRequest));
    const res2 = await Effect.runPromise(repo.getAll())
    expect(res2).toHaveLength(0)
})

afterAll(async () => {
    await dbConnection.close()
})
