import { Effect, pipe } from "effect"
import { UsersServiceImpl } from "../../../src/domain/users-management/UserServiceImpl.js";
import { UserRepositoryAdapter } from "../../../src/adapters/users-management/UserRepositoryAdapter.js";
import { RegistrationRequestRepositoryAdapter } from "../../../src/adapters/users-management/RegistrationRequestRepositoryAdapter.js"
import { Nickname, Email, PasswordHash, Role, User } from "../../../src/domain/users-management/User.js";
import { Token } from "../../../src/domain/users-management/Token.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { EmailAlreadyInUseError } from "../../../src/ports/users-management/Errors.js";

const dbName: string = "userServiceTests"
let dbConnection: mongoose.Connection;
let usersRepo: UserRepositoryAdapter;
let regReqRepo: RegistrationRequestRepositoryAdapter;
let usersService: UsersServiceImpl;
const secret = "test_secret";

beforeAll(async () => {
    dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
    usersRepo = new UserRepositoryAdapter(dbConnection);
    regReqRepo = new RegistrationRequestRepositoryAdapter(dbConnection);
    usersService = new UsersServiceImpl(usersRepo, regReqRepo, secret);
});

beforeEach(async () => {
    const collections = await dbConnection.listCollections();
    await Promise.all(collections.map(c => dbConnection.dropCollection(c.name)));
});

describe("UsersServiceImpl", () => {
    const testEmail = Email("test@example.com");
    const testNickname = Nickname("TestUser");
    const testPassword = PasswordHash("hashedPassword");
    const adminToken = Token(testEmail, Role.Admin, jwt.sign({ email: testEmail, role: Role.Admin }, secret));
    const userToken = Token(testEmail, Role.User, jwt.sign({ email: testEmail, role: Role.User }, secret));

    test("publishRegistrationRequest - should add new registration request", async () => {
        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, testPassword));
        
        const regReqs = await Effect.runPromise(regReqRepo.getAll());
        expect(regReqs).toHaveLength(1);
        expect(Array.from(regReqs)[0].email).toEqual(testEmail);
    });

    test("publishRegistrationRequest - should fail if email already in use", async () => {
        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, testPassword));
        
        await pipe(
            usersService.publishRegistrationRequest(testNickname, testEmail, testPassword),
            Effect.match({
                onSuccess() { throw new Error("This operation should have failed") },
                onFailure(error) { expect(error.__brand).toBe("EmailAlreadyInUseError") }
            }),
            Effect.runPromise
        )
    });

    test("approveRegistrationRequest - should create user from registration request", async () => {
        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, testPassword));
        await Effect.runPromise(usersService.approveRegistrationRequest(adminToken, testEmail));
        
        const users = await Effect.runPromise(usersRepo.getAll());
        expect(users).toHaveLength(1);
        expect(Array.from(users)[0].email).toEqual(testEmail);
    });

    test("approveRegistrationRequest - should fail for non-admin token", async () => {
        await expect(
            Effect.runPromise(usersService.approveRegistrationRequest(userToken, testEmail))
        ).rejects.toThrow("UnauthorizedError");
    });

    test("rejectRegistrationRequest - should remove registration request", async () => {
        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, testPassword));
        await Effect.runPromise(usersService.rejectRegistrationRequest(adminToken, testEmail));
        
        const regReqs = await Effect.runPromise(regReqRepo.getAll());
        expect(regReqs).toHaveLength(0);
    });

    test("removeUser - should remove existing user", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, testPassword, Role.User)));
        await Effect.runPromise(usersService.removeUser(adminToken, testEmail));
        
        const users = await Effect.runPromise(usersRepo.getAll());
        expect(users).toHaveLength(0);
    });

    test("removeUser - should fail if admin tries to remove himself", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, testPassword, Role.Admin)));
        await expect(
            Effect.runPromise(usersService.removeUser(adminToken, testEmail))
        ).rejects.toThrow("UnauthorizedError");
    });

    test("updateUserData - should update user information", async () => {
        const newNickname = Nickname("NewNickname");
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, testPassword, Role.User)));
        
        await Effect.runPromise(
            usersService.updateUserData(adminToken, newNickname, testPassword)
        );
        
        const updatedUser = await Effect.runPromise(usersRepo.find(testEmail));
        expect(updatedUser.nickname).toEqual(newNickname);
    });

    test("getAllUsers - should return all users", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, testPassword, Role.User)));
        
        const users = await Effect.runPromise(usersService.getAllUsers(adminToken));
        expect(Array.from(users)).toHaveLength(1);
    });

    test("getUserData - should return user data", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, testPassword, Role.User)));
        
        const user = await Effect.runPromise(usersService.getUserData(adminToken));
        expect(user.email).toEqual(testEmail);
    });

    test("login - should return token for valid credentials", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, testPassword, Role.User)));
        
        const token = await Effect.runPromise(usersService.login(testEmail, testPassword));
        expect(token).toBeDefined();
    });

    test("verifyToken - should verify valid token", async () => {
        await expect(
            Effect.runPromise(usersService.verifyToken(adminToken))
        ).resolves.not.toThrow();
    });

    test("makeToken - should create token from string", async () => {
        const tokenStr = jwt.sign({ email: testEmail, role: Role.User }, secret);
        const token = await Effect.runPromise(usersService.makeToken(tokenStr));
        
        expect(token.userEmail).toEqual(testEmail);
    });
});

afterAll(async () => {
    await dbConnection.dropDatabase();
    await dbConnection.close();
});