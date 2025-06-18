import { Effect, pipe } from "effect"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { Email, Nickname, PasswordHash, Role, User } from "../../../src/domain/users-management/User.js"
import { Token } from "../../../src/domain/users-management/Token.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UsersService.js"
import { Device, DeviceAddress, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { TaskLists } from "../../../src/domain/permissions-management/TaskLists.js"
import { EditList } from "../../../src/domain/permissions-management/EditList.js"
import { PermissionsServiceImpl } from "../../../src/domain/permissions-management/PermissionsServiceImpl.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import { ScriptId, TaskId } from "../../../src/domain/scripts-management/Script.js"
import { UserDevicePermission } from "../../../src/domain/permissions-management/UserDevicePermission.js"
import { UserNotFoundError } from "../../../src/ports/users-management/Errors.js"


let service: PermissionsService
let devicesService: DevicesService
let userDevicePermissionRepo: InMemoryRepositoryMock<[Email, DeviceId], UserDevicePermission>
let taskListsRepo: InMemoryRepositoryMock<TaskId, TaskLists>
let editListRepo: InMemoryRepositoryMock<ScriptId, EditList>

function makeToken(role: Role = Role.Admin): Token {
    return {
        userEmail: Email("test@test.com"),
        role: role,
        source: ""
    }
}

function makeTokenRole(role: Role = Role.User): Token {
    return {
        userEmail: Email("test@test.com"),
        role: role,
        source: ""
    }
}

function makeTokenWithUnknownUser(role: Role = Role.Admin): Token {
    return {
        userEmail: Email("unkown@user.com"),
        role: role,
        source: ""
    }
}

beforeEach(async () => {
    editListRepo = new InMemoryRepositoryMock((s) => s.id, (id) => id.toString())
    taskListsRepo = new InMemoryRepositoryMock((t) => t.id, (id) => id.toString())
    userDevicePermissionRepo = new InMemoryRepositoryMock(
        (p) => [p.email, p.deviceId],
        (id) => id[0].toString() + id[1].toString(),
    );
    devicesService = {
        add: () => Effect.succeed(DeviceId("1")),
        getAllDevices: () => Effect.succeed([]),
        find(token: Token, id: DeviceId) {
            if (id == DeviceId("1"))
                return Effect.succeed(Device(DeviceId("1"), "Lamp", DeviceAddress("localhost", 8080), DeviceStatus.Online, [], [], []))
            else
                return Effect.fail(DeviceNotFoundError())
        },
    } as unknown as DevicesService
    const alwaysValidTokenUsersService = {
        verifyToken() {
            return Effect.succeed(null)
        },
        getUserDataUnsafe(email: Email) {
            if ( email === Email("test@test.com")) {
                return Effect.succeed(User(Nickname("Test"), Email("test@test.com"), PasswordHash("1234"), Role.Admin))
            } else {
                return Effect.fail(UserNotFoundError())
            }
        }
    } as unknown as UsersService
    service = new PermissionsServiceImpl(userDevicePermissionRepo, taskListsRepo, editListRepo, alwaysValidTokenUsersService, devicesService)
    // Setting data for tests
    Effect.runSync(taskListsRepo.add(TaskLists(TaskId("1"), [], [])))
    Effect.runSync(taskListsRepo.add(TaskLists(TaskId("3"), [Email("test@test.com")], [])))
    Effect.runSync(editListRepo.add(EditList(TaskId("1"), [Email("test@test.com")])))
    devicesService.add(makeToken(), DeviceAddress("localhost", 8080))

})

test("addUserDevicePermission ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    )
})

test("addUserDevicePermission, expect to throw UserNotFoundError", async () => {
    await expect(
        Effect.runPromise(
          service.addUserDevicePermission(makeToken(), Email("test@failed"), DeviceId("1"))
        )
      ).rejects.toThrow("UserNotFoundError");
})


test("addUserDevicePermission, expect to throw DeviceNotFoundError", async () => {
    await expect(
        Effect.runPromise(
          service.addUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("10"))
        )
      ).rejects.toThrow("DeviceNotFoundError");
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
    expect(async () =>
        await pipe(
            service.canExecuteActionOnDevice(makeToken(), DeviceId("1")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canExecuteAction, expect PermissionError", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.canExecuteActionOnDevice(makeTokenWithUnknownUser(), DeviceId("1")),
        )
    ).rejects.toThrow("PermissionError");
})

test("canExecuteTask with an existing task and user has permissions ", async () => {
    expect(async () =>
        await pipe(
            service.canExecuteTask(makeToken(), TaskId("1")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canExecuteTask, expect a ScriptNotFoundError ", async () => {
    await expect(
        Effect.runPromise(
          service.canExecuteTask(makeToken(), TaskId("2"))
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("canExecuteTask, expect a PermissionError ", async () => {
    await expect(
        Effect.runPromise(
          service.canExecuteTask(makeToken(), TaskId("3"))
        )
    ).rejects.toThrow("PermissionError");
})

test("canEdit wiht an existing script and user has permissions ", async () => {
    expect(async () =>
        await pipe(
            service.canEdit(makeToken(), TaskId("1")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canEdit, expect a ScriptNotFoundError", async () => {
    await expect(
        Effect.runPromise(
            service.canEdit(makeToken(), TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("canEdit, expect a PermissionError", async () => {
    await expect(
        Effect.runPromise(
            service.canEdit(makeTokenWithUnknownUser(), TaskId("1")),
        )
    ).rejects.toThrow("PermissionError");
})

test("addToEditList", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
})

test("addToEditList, expect a ScriptNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToEditlist(makeToken(), Email("test@test.com") ,TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
    expect(editListRepo.callsToUpdate).toBe(0)
})

test("addToEditList, expect a UserNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToEditlist(makeToken(), Email("unkown@user.com") ,TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
    expect(editListRepo.callsToUpdate).toBe(0)
})

test("addToEditList, expect a UnauthorizedError because user is not an admin", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToEditlist(makeTokenRole(), Email("test@test.com") ,TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
    expect(editListRepo.callsToUpdate).toBe(0)
})

test("removeFromEditList wiht an existing script", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await pipe(
        service.removeFromEditlist(makeToken(), Email("test@test.com") ,TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(2)
})

test("removeFromEditList, expect ScriptNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromEditlist(makeToken(), Email("test@test.com") ,TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("removeFromEditList, expect UnauthorizedError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromEditlist(makeTokenRole(), Email("test@test.com") ,TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("removeFromEditList, expect UserNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(), Email("test@test.com") ,TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromEditlist(makeToken(), Email("unkown@user.com") ,TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToWhiteList", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("addToWhiteList, expect ScriptNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("200")),    
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("addToWhiteList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeTokenRole(), Email("test@test.com") , TaskId("1")),    
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("addToWhiteList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeToken(), Email("unkown@user.com") , TaskId("1")),    
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToWhiteList, expect PermissionError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    )
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),    
        )
    ).rejects.toThrow("InvalidOperationError");
})

test("removeToWhiteList wiht an existing task", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await pipe(
        service.removeFromWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(2)
})

test("removeToWhiteList, expect ScriptNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromWhitelist(makeToken(), Email("test@test.com") , TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("removeToWhiteList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromWhitelist(makeTokenRole(), Email("test@test.com") , TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("removeToWhiteList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromWhitelist(makeToken(), Email("unkown@user.com") , TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToBlackList", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("addToBlackList, expect ScriptNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("addToBlackList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(), Email("unkown@user.com") , TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToBlackList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeTokenRole(), Email("test@test.com") , TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("addToBlackList, expect PermissionError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    )
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),    
        )
    ).rejects.toThrow("InvalidOperationError");
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

test("removeFromBlackList, expect ScriptNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.removeFromBlacklist(makeToken(), Email("test@test.com") , TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("removeFromBlackList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.removeFromBlacklist(makeTokenRole(), Email("test@test.com") , TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("removeFromBlackList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(), Email("test@test.com") , TaskId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.removeFromBlacklist(makeToken(), Email("unkown@user.com") , TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})