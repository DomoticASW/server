import { Effect, pipe } from "effect"
import { UsersServiceImpl } from "../../../src/domain/users-management/UsersServiceImpl.js";
import { UserRepositoryAdapter } from "../../../src/adapters/users-management/UserRepositoryAdapter.js";
import { RegistrationRequestRepositoryAdapter } from "../../../src/adapters/users-management/RegistrationRequestRepositoryAdapter.js"
import { Nickname, Email, PasswordHash, Role, User, ClearTextPassword } from "../../../src/domain/users-management/User.js";
import { Token } from "../../../src/domain/users-management/Token.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const dbName: string = "usersServiceTests"
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
    const password = "password";
    const clearTestPassword = ClearTextPassword(password);
    const hashedPassword =  bcrypt.hashSync(password, 10);
    const hashedTestPassword = PasswordHash(hashedPassword);
    const adminToken = Token(testEmail, Role.Admin, jwt.sign({ userEmail: testEmail, role: Role.Admin }, secret, { expiresIn: '1h' }));
    const userToken = Token(testEmail, Role.User, jwt.sign({ userEmail: testEmail, role: Role.User }, secret, { expiresIn: '1h' }));

    test("getAllRegistrationRequests - should return no registration requests initially", async () => {
        const requests = await Effect.runPromise(usersService.getAllRegistrationRequests(adminToken));
        expect(requests).toHaveLength(0);
    });

    test("publishRegistrationRequest - should directly create a new admin user if it's the first request ever", async () => {
        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));

        const regReqs = await Effect.runPromise(regReqRepo.getAll());
        expect(regReqs).toHaveLength(0);

        const users = await Effect.runPromise(usersService.getAllUsers(userToken))
        expect(users).toHaveLength(1);

        const admin = Array.from(users)[0]
        expect(admin.email).toEqual(testEmail);
        expect(admin.nickname).toEqual(testNickname);
        expect(admin.role).toEqual(Role.Admin);
    });

    test("publishRegistrationRequest - should add new registration request", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        
        const regReqs = await Effect.runPromise(regReqRepo.getAll());
        expect(regReqs).toHaveLength(1);
        expect(Array.from(regReqs)[0].email).toEqual(testEmail);
    });

    test("getAllRegistrationRequests - should return all registration requests", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));

        const requests = await Effect.runPromise(usersService.getAllRegistrationRequests(adminToken));
        const request = Array.from(requests)[0]
        expect(requests).toHaveLength(1);
        expect(request.nickname).toEqual(testNickname);
        expect(request.email).toEqual(testEmail);
        expect(bcrypt.compare(clearTestPassword, request.passwordHash)).resolves.toBe(true);
    });

    test("publishRegistrationRequest - should fail if email already in use", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        
        await pipe(
            usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword),
            Effect.match({
                onSuccess() { throw new Error("This operation should have failed") },
                onFailure(error) { expect(error.__brand).toBe("EmailAlreadyInUseError") }
            }),
            Effect.runPromise
        )
    });

    test("approveRegistrationRequest - should create user from registration request and remove the request", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        await Effect.runPromise(usersService.approveRegistrationRequest(adminToken, testEmail));
        
        const users = await Effect.runPromise(usersRepo.getAll());
        const requests = await Effect.runPromise(regReqRepo.getAll());
        expect(users).toHaveLength(2); // The one created plus the admin
        expect(requests).toHaveLength(0);
        expect(Array.from(users).filter(u => u.nickname != Nickname("Admin"))[0].email).toEqual(testEmail);
    });

    test("approveRegistrationRequest - should fail for non-admin token", async () => {
        await expect(
            Effect.runPromise(usersService.approveRegistrationRequest(userToken, testEmail))
        ).rejects.toThrow("UnauthorizedError");
    });

    test("approveRegistrationRequest - should fail if user does not exist", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        await Effect.runPromise(usersService.rejectRegistrationRequest(adminToken, testEmail));
        
        await expect(
            Effect.runPromise(usersService.approveRegistrationRequest(adminToken, testEmail))
        ).rejects.toThrow("RegistrationRequestNotFoundError");
    });

    test("approveRegistrationRequest - should fail if the email is already used by a user", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        await Effect.runPromise(usersService.approveRegistrationRequest(adminToken, testEmail));
        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        
        await expect(
            Effect.runPromise(usersService.approveRegistrationRequest(adminToken, testEmail))
        ).rejects.toThrow("EmailAlreadyInUseError");
    });

    test("rejectRegistrationRequest - should remove registration request", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        await Effect.runPromise(usersService.rejectRegistrationRequest(adminToken, testEmail));
        
        const regReqs = await Effect.runPromise(regReqRepo.getAll());
        expect(regReqs).toHaveLength(0);
    });

    test("rejectRegistrationRequest - should fail if request does not exist", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        
        await expect(
            Effect.runPromise(usersService.rejectRegistrationRequest(adminToken, Email("")))
        ).rejects.toThrow("RegistrationRequestNotFoundError");
    });

    test("rejectRegistrationRequest - should fail for non-admin token", async () => {
        // This is just to create an admin and should not be considered when reasoning about the test
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        await Effect.runPromise(usersService.publishRegistrationRequest(testNickname, testEmail, clearTestPassword));
        
        await expect(
            Effect.runPromise(usersService.rejectRegistrationRequest(userToken, testEmail))
        ).rejects.toThrow("UnauthorizedError");
    });

    test("removeUser - should remove existing user", async () => {
        const email = Email("testEmail@example.com");
        await Effect.runPromise(usersRepo.add(User(testNickname, email, hashedTestPassword, Role.User)));
        await Effect.runPromise(usersService.removeUser(adminToken, email));
        
        const users = await Effect.runPromise(usersRepo.getAll());
        expect(users).toHaveLength(0);
    });

    test("removeUser - should fail if admin tries to remove himself", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.Admin)));
        await expect(
            Effect.runPromise(usersService.removeUser(adminToken, testEmail))
        ).rejects.toThrow("UnauthorizedError");
    });

    test("removeUser - should fail if user does not exist", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.User)));
        
        await expect(
            Effect.runPromise(usersService.removeUser(adminToken, Email("")))
        ).rejects.toThrow("UserNotFoundError");
    });

    test("updateUserData - should update user information", async () => {
        const newNickname = Nickname("NewNickname");
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.User)));
        
        await Effect.runPromise(
            usersService.updateUserData(adminToken, newNickname, clearTestPassword)
        );
        
        const updatedUser = await Effect.runPromise(usersRepo.find(testEmail));
        expect(updatedUser.nickname).toEqual(newNickname);
    });

    test("updateUserData - should fail if user does not exist", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, Email("prova@mail.com"), hashedTestPassword, Role.User)));
        
        await expect(
            Effect.runPromise(usersService.updateUserData(userToken, Nickname("NewNickname"), ClearTextPassword("newPassword")))
        ).rejects.toThrow("UserNotFoundError");
    });

    test("getAllUsers - should return all users", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.User)));
        
        const users = await Effect.runPromise(usersService.getAllUsers(adminToken));
        expect(Array.from(users)).toHaveLength(1);
    });

    test("getUserData - should return user data", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.User)));
        
        const user = await Effect.runPromise(usersService.getUserData(adminToken));
        expect(user.email).toEqual(testEmail);
    });

    test("getUserDataUnsafe - should return user data without verifying token", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.User)));

        const user = await Effect.runPromise(usersService.getUserDataUnsafe(testEmail));
        expect(user.email).toEqual(testEmail);
    });

    test("login - should return token for valid credentials", async () => {
        await Effect.runPromise(usersService.publishRegistrationRequest(Nickname("Admin"), Email("admin@email.com"), clearTestPassword));

        const token = await Effect.runPromise(usersService.login(Email("admin@email.com"), clearTestPassword));
        expect(token).toBeDefined();
    });

    test("login - should fail for invalid credentials", async () => {
        await Effect.runPromise(usersRepo.add(User(testNickname, testEmail, hashedTestPassword, Role.User)));
        
        await expect(
            Effect.runPromise(usersService.login(testEmail, ClearTextPassword("wrongPassword")))
        ).rejects.toThrow("InvalidCredentialsError");
    });

    test("verifyToken - should verify valid token", async () => {
        await expect(
            Effect.runPromise(usersService.verifyToken(adminToken))
        ).resolves.not.toThrow();
    });

    test("verifyToken - should fail for invalid token", async () => {
        const invalidToken = Token(testEmail, Role.User, "invalid_token");
        
        await expect(
            Effect.runPromise(usersService.verifyToken(invalidToken))
        ).rejects.toThrow("InvalidTokenError");
    });

    test("makeToken - should create token from string", async () => {
        const tokenStr = jwt.sign({ userEmail: testEmail, role: Role.User }, secret);
        const token = await Effect.runPromise(usersService.makeToken(tokenStr));
        
        expect(token.userEmail).toEqual(testEmail);
    });
});

afterAll(async () => {
    await dbConnection.dropDatabase();
    await dbConnection.close();
});