import { Effect, pipe } from "effect"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { Email, Nickname, PasswordHash, Role, User } from "../../../src/domain/users-management/User.js"
import { Token } from "../../../src/domain/users-management/Token.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UsersService.js"
import { Device, DeviceActionId, DeviceAddress, DeviceId, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { TaskLists } from "../../../src/domain/permissions-management/TaskLists.js"
import { EditList } from "../../../src/domain/permissions-management/EditList.js"
import { PermissionsServiceImpl } from "../../../src/domain/permissions-management/PermissionsServiceImpl.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import { ScriptId, Task, TaskId } from "../../../src/domain/scripts-management/Script.js"
import { UserDevicePermission } from "../../../src/domain/permissions-management/UserDevicePermission.js"
import { UserNotFoundError } from "../../../src/ports/users-management/Errors.js"
import { DeviceActionInstruction } from "../../../src/domain/scripts-management/InstructionImpl.js"
import { ScriptsService } from "../../../src/ports/scripts-management/ScriptsService.js"
import { ScriptNotFoundError } from "../../../src/ports/scripts-management/Errors.js"
import bcrypt from "bcrypt"


let service: PermissionsService
let devicesService: DevicesService
let scriptsService: ScriptsService
let userDevicePermissionRepo: InMemoryRepositoryMock<[Email, DeviceId], UserDevicePermission>
let taskListsRepo: InMemoryRepositoryMock<TaskId, TaskLists>
let editListRepo: InMemoryRepositoryMock<ScriptId, EditList>

function makeToken(role: Role): Token {
    return {
        userEmail: Email("test@test.com"),
        role: role,
        source: ""
    }
}

function makeUnknownToken(role: Role): Token {
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
            if (id == DeviceId("5000"))
                return Effect.succeed(Device(DeviceId("5000"), "Lamp", DeviceAddress("localhost", 8080), DeviceStatus.Online, [], [], []))
            else
                return Effect.fail(DeviceNotFoundError())
        },
    } as unknown as DevicesService
    const alwaysValidTokenUsersService = {
        verifyToken() {
            return Effect.succeed(null)
        },
        getUserDataUnsafe(email: Email) {
            const password = "password";
            const hashedPassword = bcrypt.hashSync(password, 10);
            if (email === Email("test@test.com")) {
                return Effect.succeed(User(Nickname("Test"), Email("test@test.com"), PasswordHash(hashedPassword), Role.Admin))
            } else if (email === Email("user@user.com")) {
                return Effect.succeed(User(Nickname("User"), Email("user@user.com"), PasswordHash(hashedPassword), Role.User))
            } else {
                return Effect.fail(UserNotFoundError())
            }
        }
    } as unknown as UsersService
    scriptsService = {
        findTask(token: Token, taskId: TaskId) {
            if (taskId === TaskId("2") || taskId === TaskId("1")) {
                return Effect.succeed(Task(taskId, "Test Script", [DeviceActionInstruction(DeviceId("1"), DeviceActionId("1"), "")]))
            } else {
                return Effect.fail(ScriptNotFoundError("NotFoundError"))
            }
        },
        findTaskUnsafe(taskId: TaskId) {
            if (taskId === TaskId("2") || taskId === TaskId("1")) {
                return Effect.succeed(Task(taskId, "Test Script", [DeviceActionInstruction(DeviceId("1"), DeviceActionId("1"), "")]))
            } else {
                return Effect.fail(ScriptNotFoundError("NotFoundError"))
            }
        },
    } as unknown as ScriptsService
    service = new PermissionsServiceImpl(userDevicePermissionRepo, taskListsRepo, editListRepo, alwaysValidTokenUsersService, devicesService)
    service.registerScriptService(scriptsService)
    // Setting data for tests
    Effect.runSync(taskListsRepo.add(TaskLists(TaskId("1"), [], [])))
    Effect.runSync(taskListsRepo.add(TaskLists(TaskId("3"), [Email("test@test.com")], [])))
    Effect.runSync(taskListsRepo.add(TaskLists(TaskId("4"), [], [Email("test@test.com")])))
    Effect.runSync(editListRepo.add(EditList(TaskId("1"), [Email("test@test.com")])))
    Effect.runSync(userDevicePermissionRepo.add(UserDevicePermission(Email("test@test.com"), DeviceId("1"))))
    devicesService.add(makeToken(Role.Admin), DeviceAddress("localhost", 8080))

})

test("findUserDevicePermission with an existing permission", async () => {
    const permission = await pipe(
        service.findUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    expect(permission.email).toEqual(Email("test@test.com"));
})

test("addUserDevicePermission ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    )
})

test("addUserDevicePermission, expect to throw UserNotFoundError", async () => {
    await expect(
        Effect.runPromise(
            service.addUserDevicePermission(makeToken(Role.Admin), Email("test@failed"), DeviceId("1"))
        )
    ).rejects.toThrow("UserNotFoundError");
})


test("addUserDevicePermission, expect to throw DeviceNotFoundError", async () => {
    await expect(
        Effect.runPromise(
            service.addUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("10"))
        )
    ).rejects.toThrow("DeviceNotFoundError");
})

test("remove existing userDevicePermission ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    await pipe(
        service.removeUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
})

test("findAllUserDevicePermissionsOfAnUser ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("user@user.com"), DeviceId("1")),
        Effect.runPromise
    );
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("user@user.com"), DeviceId("5000")),
        Effect.runPromise
    )
    const list = await pipe(
        service.findAllUserDevicePermissionsOfAnUser(makeToken(Role.Admin), Email("user@user.com")),
        Effect.runPromise
    )
    expect(list).toHaveLength(2)
})

test("findAllUserDevicePermissionsOfAnUser, expect UnauthorizedError ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("user@user.com"), DeviceId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.findAllUserDevicePermissionsOfAnUser(makeToken(Role.User), Email("user@user.com")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("findAllUserDevicePermissionsOfAnUser, expect UserNotFoundError ", async () => {
    await expect(
        Effect.runPromise(
            service.findAllUserDevicePermissionsOfAnUser(makeToken(Role.User), Email("unkown@user.com")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("canExecuteAction on an existing device and user has permissions ", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    expect(async () =>
        await pipe(
            service.canExecuteActionOnDevice(makeToken(Role.User), DeviceId("1")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canExecuteAction on an existing device with an admin ", async () => {
    expect(async () =>
        await pipe(
            service.canExecuteActionOnDevice(makeToken(Role.Admin), DeviceId("1")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canExecuteAction, expect PermissionError", async () => {
    await pipe(
        service.addUserDevicePermission(makeToken(Role.Admin), Email("test@test.com"), DeviceId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.canExecuteActionOnDevice(makeUnknownToken(Role.User), DeviceId("1")),
        )
    ).rejects.toThrow("PermissionError");
})

test("canExecuteTask with an existing taskList and user is whitelisted ", async () => {
    expect(async () =>
        await pipe(
            service.canExecuteTask(makeToken(Role.Admin), TaskId("4")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canExecuteTask without a TaskLists but with the permissions of every device instruction", async () => {
    expect(async () =>
        await pipe(
            service.canExecuteTask(makeToken(Role.Admin), TaskId("2")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canExecuteTask, expect a ScriptNotFoundError ", async () => {
    await expect(
        Effect.runPromise(
            service.canExecuteTask(makeToken(Role.Admin), TaskId("5"))
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("canExecuteTask, expect a PermissionError because user is blacklisted ", async () => {
    await expect(
        Effect.runPromise(
            service.canExecuteTask(makeToken(Role.User), TaskId("3"))
        )
    ).rejects.toThrow("PermissionError");
})

test("canExecuteTask, user is blacklisted but is an Admin ", async () => {
    expect(async () =>
    await pipe(
        Effect.runPromise(
            service.canExecuteTask(makeToken(Role.Admin), TaskId("3"))
        )
    )).not.toThrow();
})

test("canEdit wiht an existing script and user has permissions ", async () => {
    expect(async () =>
        await pipe(
            service.canEdit(makeToken(Role.User), TaskId("1")),
            Effect.runPromise
        )
    ).not.toThrow();
})

test("canEdit, expect a ScriptNotFoundError", async () => {
    await expect(
        Effect.runPromise(
            service.canEdit(makeToken(Role.Admin), TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("canEdit, Admin can edit even if not in editlist", async () => {
    await Effect.runPromise(service.canEdit(makeUnknownToken(Role.Admin), TaskId("1")))
})

test("canEdit, expect a PermissionError", async () => {
    await expect(
        Effect.runPromise(
            service.canEdit(makeUnknownToken(Role.User), TaskId("1")),
        )
    ).rejects.toThrow("PermissionError");
})

test("findEditList", async () => {
    const editList = await pipe(
        service.findEditList(makeToken(Role.Admin), TaskId("1")),
        Effect.runPromise
    );
    expect(editList.users).toContain(Email("test@test.com"));
})

test("addToEditList", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
})

test("addToEditList to a list that doesn't exist", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("2")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
})

test("addToEditList, expect a UserNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToEditlist(makeToken(Role.Admin), Email("unkown@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
    expect(editListRepo.callsToUpdate).toBe(0)
})

test("addToEditList, expect a UnauthorizedError because user is not an admin", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToEditlist(makeToken(Role.User), Email("test@test.com"), TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
    expect(editListRepo.callsToUpdate).toBe(0)
})

test("removeFromEditList wiht an existing script", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await pipe(
        service.removeFromEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(2)
})

test("removeFromEditList, expect ScriptNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("removeFromEditList, expect UnauthorizedError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromEditlist(makeToken(Role.User), Email("test@test.com"), TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("removeFromEditList, expect UserNotFoundError", async () => {
    expect(editListRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToEditlist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(editListRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromEditlist(makeToken(Role.Admin), Email("unkown@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("findTaskLists with an existing task", async () => {
    const taskLists = await pipe(
        service.findTaskLists(makeToken(Role.Admin), TaskId("1")),
        Effect.runPromise
    );
    expect(taskLists.blacklist).toEqual([]);
    expect(taskLists.whitelist).toEqual([]);
})

test("addToWhiteList", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("addToWhiteList to a list that doesn't exist", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("200")),
        Effect.runPromise
    )
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("addToWhiteList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeToken(Role.User), Email("test@test.com"), TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("addToWhiteList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeToken(Role.Admin), Email("unkown@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToWhiteList, expect InvalidOperationError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    )
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.addToWhitelist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("InvalidOperationError");
})

test("removeToWhiteList wiht an existing task", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await pipe(
        service.removeFromWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(2)
})

test("removeToWhiteList, expect ScriptNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("removeToWhiteList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromWhitelist(makeToken(Role.User), Email("test@test.com"), TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("removeToWhiteList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.removeFromWhitelist(makeToken(Role.Admin), Email("unkown@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToBlackList", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("addToBlackList to a list that doesn't exist", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("200")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(1)
})

test("addToBlackList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(Role.Admin), Email("unkown@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})

test("addToBlackList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(Role.User), Email("user@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("addToBlackList, expect InvalidOperationError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToWhitelist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    )
    expect(taskListsRepo.callsToUpdate).toBe(1)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("InvalidOperationError");
})

test("addToBlackList, expect InvalidOperationError because user is an Admin", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await expect(
        Effect.runPromise(
            service.addToBlacklist(makeToken(Role.Admin), Email("test@test.com"), TaskId("1")),
        )
    ).rejects.toThrow("InvalidOperationError");
})

test("removeFromBlackList wiht an existing task", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    );
    await pipe(
        service.removeFromBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    );
    expect(taskListsRepo.callsToUpdate).toBe(2)
})

test("removeFromBlackList, expect ScriptNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.removeFromBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("200")),
        )
    ).rejects.toThrow("ScriptNotFoundError");
})

test("removeFromBlackList, expect UnauthorizedError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.removeFromBlacklist(makeToken(Role.User), Email("user@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UnauthorizedError");
})

test("removeFromBlackList, expect UserNotFoundError", async () => {
    expect(taskListsRepo.callsToUpdate).toBe(0)
    await pipe(
        service.addToBlacklist(makeToken(Role.Admin), Email("user@user.com"), TaskId("1")),
        Effect.runPromise
    );
    await expect(
        Effect.runPromise(
            service.removeFromBlacklist(makeToken(Role.Admin), Email("unkown@user.com"), TaskId("1")),
        )
    ).rejects.toThrow("UserNotFoundError");
})
