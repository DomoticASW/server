import { match, runPromise } from "effect/Effect"
import { ScriptsServiceImpl } from "../../../src/domain/scripts-management/ScriptsServiceImpl.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { NotificationsService } from "../../../src/ports/notifications-management/NotificationsService.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import { ScriptRepository } from "../../../src/ports/scripts-management/ScriptRepository.js"
import { ScriptsService } from "../../../src/ports/scripts-management/ScriptsService.js"
import { UsersService } from "../../../src/ports/users-management/UserService.js"
import { InMemoryRepositoryMockCheckingUniqueness } from "../../InMemoryRepositoryMock.js"
import { DeviceMock, DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, TokenMock, UserMock, UsersServiceSpy } from "../../utils/mocks.js"
import { Spy } from "../../utils/spy.js"
import { pipe } from "effect"
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"
import { flatMap } from "effect/Effect"
import { InvalidTokenError } from "../../../src/ports/users-management/Errors.js"
import { InvalidScriptError, TaskNameAlreadyInUse } from "../../../src/ports/scripts-management/Errors.js"
import { Type } from "../../../src/ports/devices-management/Types.js"
import { NumberEOperator, StringEOperator } from "../../../src/domain/scripts-management/Operators.js"
import { TaskId } from "../../../src/domain/scripts-management/Script.js"

const user = UserMock()
const email = user.email
const token = TokenMock(email)
const device = DeviceMock("eventName")
let devicesServiceSpy: Spy<DevicesService>
let notificationsServiceSpy: Spy<NotificationsService>
let usersServiceSpy: Spy<UsersService>
let permissionsService: Spy<PermissionsService>
let scriptsRepository: ScriptRepository
let scriptsService: ScriptsService

const taskBuilderAndRef = TaskBuilder("taskName")
const root = taskBuilderAndRef[1]
const taskBuilder = taskBuilderAndRef[0].addSendNotification(root, email, "message")

beforeEach(() => {
  devicesServiceSpy = DevicesServiceSpy(device)
  notificationsServiceSpy = NotificationsServiceSpy(email)
  usersServiceSpy = UsersServiceSpy(user, token)
  permissionsService = PermissionsServiceSpy(token)
  scriptsRepository = new InMemoryRepositoryMockCheckingUniqueness((script) => script.id, (id) => id, (script1, script2) => script1.name != script2.name)
  scriptsService = new ScriptsServiceImpl(scriptsRepository, devicesServiceSpy.get(), notificationsServiceSpy.get(), usersServiceSpy.get(), permissionsService.get())
})

test("Initially does not have tasks", async () => {
  const tasks = await runPromise(scriptsService.getAllTasks(token))
  expect(tasks).toHaveLength(0)
  expect(usersServiceSpy.call()).toBe(1)
})

test("Cannot get tasks with invalid token", async () => {
  const token = TokenMock("otherEmail")
  await runPromise(pipe(
    scriptsService.getAllTasks(token),
    match({
      onSuccess: () => {
        throw Error("should not be here")
      },
      onFailure: err => {
        expect(err.__brand).toBe("InvalidTokenError")
        expect(usersServiceSpy.call()).toBe(1)
      }
    })
  ))
})

test("Initially does not have automations", async () => {
  const automations = await runPromise(scriptsService.getAllAutomations(token))
  expect(automations).toHaveLength(0)
  expect(usersServiceSpy.call()).toBe(1)
})

test("Cannot get automations with invalid token", async () => {
  const token = TokenMock("otherEmail")
  await runPromise(pipe(
    scriptsService.getAllAutomations(token),
    match({
      onSuccess: () => {
        throw Error("should not be here")
      },
      onFailure: err => {
        expect(err.__brand).toBe("InvalidTokenError")
        expect(usersServiceSpy.call()).toBe(1)
      }
    })
  ))
})

test("Creating a task adds it to the service and the repository", async () => {
  const task = await runPromise(pipe(
    scriptsService.createTask(token, taskBuilder),
    flatMap(id => scriptsService.findTask(token, id))
  ))

  const tasks = await runPromise(scriptsService.getAllTasks(token))
  const repoTasks = await runPromise(scriptsRepository.getAll())

  expect(tasks).toContain(task)
  expect(repoTasks).toContain(task)
  expect(usersServiceSpy.call()).toBe(3)
})

test("Cannot create a task if the token is not valid", async () => {
  await runPromise(pipe(
    scriptsService.createTask(TokenMock("otherEmail"), taskBuilder),
    match({
      onSuccess: () => { throw Error("should not be here") },
      onFailure: err => {
        expect(err).toStrictEqual(InvalidTokenError())
      },
    })
  ))

  expect(usersServiceSpy.call()).toBe(1)
})

test("Cannot create two tasks with the same name", async () => {
  await runPromise(pipe(
    scriptsService.createTask(token, taskBuilder),
    flatMap(() => scriptsService.createTask(token, taskBuilder)),
    match({
      onSuccess: () => { throw Error("should not be here") },
      onFailure: err => {
        expect(err).toStrictEqual(TaskNameAlreadyInUse())
      },
    })
  ))

  expect(usersServiceSpy.call()).toBe(2)
})

test("If trying to create a task with syntax errors, the errors are returned", async () => {
  const builderAndConstant = taskBuilder.addCreateConstant(root, "constantName", Type.IntType, 10)
  const automationBuilderOneConstant = builderAndConstant[0]

  const builderAndConstant2 = automationBuilderOneConstant.addCreateConstant(root, "constantName2", Type.IntType, 10)
  const automationBuilderTwoConstants = builderAndConstant2[0]

  const builderAndRef = automationBuilderTwoConstants.addIf(root, builderAndConstant[1], builderAndConstant2[1], NumberEOperator(), false)
  const automationBuilderIf = builderAndRef[0]
  const ifRef = builderAndRef[1]

  const builderAndConstant3 = automationBuilderIf.addSendNotification(ifRef, user.email, "firstMessage").addCreateConstant(ifRef, "constantName3", Type.StringType, "string")
  const builderAndConstant4 = builderAndConstant3[0].addCreateConstant(ifRef, "constantName4", Type.StringType, "anotherString")
  const builderAndRef2 = builderAndConstant4[0].addIf(root, builderAndConstant3[1], builderAndConstant4[1], StringEOperator(), true)
  const taskBuilderComplete = builderAndRef2[0].addSendNotification(builderAndRef2[1], user.email, "secondMessage")

  await runPromise(pipe(
    scriptsService.createTask(token, taskBuilderComplete),
    match({
      onSuccess: () => { throw Error("should not be here") },
      onFailure: err => {
        expect(err).toStrictEqual([
          InvalidScriptError("The constant constantName3 was not defined inside of the if's scope"), 
          InvalidScriptError("The constant constantName4 was not defined inside of the if's scope")
        ])
      },
    })
  ))
})

test("Cannot find a task without a valid token using the safe findTask method", async () => {
  await runPromise(pipe(
    scriptsService.createTask(token, taskBuilder),
    flatMap(taskId => scriptsService.findTask(TokenMock("otherEmail"), taskId)),
    match({
      onSuccess: () => { throw Error("Should not be here") },
      onFailure: err => {
        expect(err).toStrictEqual(InvalidTokenError())
      }
    })
  ))
})

test("An error is returned if the task searched does not exists", async () => {
  await runPromise(pipe(
    scriptsService.findTask(token, TaskId("1")),
    match({
      onSuccess: () => { throw Error("Should not be here") },
      onFailure: err => {
        expect(err.__brand).toBe("ScriptNotFoundError")
      }
    })
  ))
})
