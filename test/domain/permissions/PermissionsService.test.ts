import { Effect, pipe } from "effect"
import { InMemoryRepositoryMock, InMemoryRepositoryMockCheckingUniqueness } from "../../InMemoryRepositoryMock.js"
import { Email, Nickname, PasswordHash, Role, User } from "../../../src/domain/users-management/User.js"
import { Token, UserRole } from "../../../src/domain/users-management/Token.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UserService.js"
import { Device, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { TaskLists } from "../../../src/domain/permissions-management/TaskLists.js"
import { ScriptId, TaskId } from "../../../src/domain/scripts/Script.js"
import { EditList } from "../../../src/domain/permissions-management/EditList.js"
import { PermissionsServiceImpl } from "../../../src/domain/permissions-management/PermissionsServiceImpl.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import mongoose from "mongoose"
import { UserDevicePermissionRepositoryMongoAdapter } from "../../../src/adapters/permissions-management/UserDevicePermissionRepositoryMongoAdapter.js"
import { UserDevicePermissionRepository } from "../../../src/ports/permissions-management/UserDevicePermissionRepository.js"


const dbName: string = "UserDevicePermissionRepositoryTests"
let dbConnection: mongoose.Connection
let service: PermissionsService
let devicesService: DevicesService
let userDevicePermissionRepo: UserDevicePermissionRepository
let taskListsRepo: InMemoryRepositoryMockCheckingUniqueness<TaskId, TaskLists>
let editListRepo: InMemoryRepositoryMockCheckingUniqueness<ScriptId, EditList>
let userRepo: InMemoryRepositoryMockCheckingUniqueness<Email, User>

function makeToken(role: UserRole = UserRole.Admin): Token {
    return {
        userEmail: Email("test@test.com"),
        role: role
    }
}

beforeEach(async () => {
    editListRepo = new InMemoryRepositoryMock((s) => s.id)
    taskListsRepo = new InMemoryRepositoryMock((t) => t.id)
    // userDevicePermissionRepo = new InMemoryRepositoryMock((p) => [p.email, p.deviceId])
    dbConnection = await mongoose.createConnection(`mongodb://localhost:27018/${dbName}`).asPromise();
    userDevicePermissionRepo = new UserDevicePermissionRepositoryMongoAdapter(dbConnection);
    userRepo = new InMemoryRepositoryMockCheckingUniqueness((u) => u.email, (u1, u2) => u1.email != u2.email)
    devicesService = {
        add: () => Effect.succeed(DeviceId("1")),
        getAllDevices: () => Effect.succeed([]),
        find(token: Token, id: DeviceId) {
            if (id == DeviceId("1"))
                return Effect.succeed(Device(DeviceId("1"), "Lamp", new URL("localhost:8080"), DeviceStatus.Online, [], [], []))
            else
                return Effect.fail(DeviceNotFoundError())
        },
    } as unknown as DevicesService
    const alwaysValidTokenUsersService = {
        verifyToken() {
            return Effect.succeed(null)
        }
    } as unknown as UsersService
    service = new PermissionsServiceImpl(userDevicePermissionRepo, taskListsRepo, editListRepo, userRepo, alwaysValidTokenUsersService, devicesService)
    // Setting data for tests
    Effect.runSync(userRepo.add(User(Nickname("Test"), Email("test@test.com"), PasswordHash("1234"), Role.Admin)))
    Effect.runSync(taskListsRepo.add(TaskLists(TaskId("1"), [], [])))
    Effect.runSync(editListRepo.add(EditList(ScriptId("1", "Task"), [Email("test@test.com")])))
    devicesService.add(makeToken(), new URL("localhost:8080"))

})

test("addUserDevicePermission ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    )
})

test("remove existing userDevicePermission ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    await pipe(
        service.removeUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
})

test("canExecuteAction on an existing device and user has permissions ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    const result = await pipe(
        service.canExecuteActionOnDevice(makeToken(), DeviceId("1")),
        Effect.runPromise
    );
    expect(result).toBe(true);
})

test("canExecuteTask wiht an existing task and user has permissions ", async () => {
    const result = await pipe(
        service.canExecuteTask(makeToken(), TaskId("1")),
        Effect.runPromise
    );
    expect(result).toBe(true);
})

test("canEdit wiht an existing script and user has permissions ", async () => {
    const result = await pipe(
        service.canEdit(makeToken(), ScriptId("1", "Task")),
        Effect.runPromise
    );
    expect(result).toBe(true);
})

test("addToEditList", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,ScriptId("1", "Task")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
})

test("removeFromEditList wiht an existing script", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,ScriptId("1", "Task")),
        Effect.runPromise
    );
    await pipe(
        service.removeFromEditlist(makeToken(), Email("test@test.com") ,ScriptId("1", "Task")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(2)
})

test("addToWhiteList", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("removeToWhiteList wiht an existing task", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    await pipe(
        service.removeFromWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(2)
})

test("addToBlackList", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("removeFromBlackList wiht an existing task", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    await pipe(
        service.removeFromBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(2)
})


