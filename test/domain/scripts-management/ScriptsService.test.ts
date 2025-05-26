import { match, runPromise } from "effect/Effect"
import { ScriptsServiceImpl } from "../../../src/domain/scripts-management/ScriptsServiceImpl.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"
import { NotificationsService } from "../../../src/ports/notifications-management/NotificationsService.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import { ScriptRepository } from "../../../src/ports/scripts-management/ScriptRepository.js"
import { ScriptsService } from "../../../src/ports/scripts-management/ScriptsService.js"
import { UsersService } from "../../../src/ports/users-management/UserService.js"
import { InMemoryRepositoryMock } from "../../InMemoryRepositoryMock.js"
import { DeviceMock, DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, TokenMock, UserMock, UsersServiceSpy } from "../../utils/mocks.js"
import { Spy } from "../../utils/spy.js"
import { pipe } from "effect"
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"
import { flatMap } from "effect/Effect"

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
const taskBuilder = taskBuilderAndRef[0].addSendNotification(taskBuilderAndRef[1], email, "message")

beforeEach(() => {
  devicesServiceSpy = DevicesServiceSpy(device)
  notificationsServiceSpy = NotificationsServiceSpy(email)
  usersServiceSpy = UsersServiceSpy(user, token)
  permissionsService = PermissionsServiceSpy(token)
  scriptsRepository = new InMemoryRepositoryMock((script) => script.id, (id) => id)
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
