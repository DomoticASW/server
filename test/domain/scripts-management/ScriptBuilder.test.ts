import { runPromise } from "effect/Effect"
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"
import { RootNodeRef } from "../../../src/domain/scripts-management/Refs.js"
import { DevicesServiceSpy, NotificationsServiceSpy, PermissionsServiceSpy, ScriptsServiceSpy, TokenMock, UserMock } from "../../utils/mocks.js"

const builderAndRoot = TaskBuilder("taskName")
const taskBuilder: TaskBuilder = builderAndRoot[0]
const root: RootNodeRef = builderAndRoot[1]

const user = UserMock()
const token = TokenMock(user.email)
// const email = user.email
// const device = DeviceMock()
// const deviceId = device.id
const notificationService = NotificationsServiceSpy(user.email).get()
const devicesService = DevicesServiceSpy().get()
const scriptsService = ScriptsServiceSpy().get()
const permissionsService = PermissionsServiceSpy().get()

test("A TaskBuilder can be created", async () => {
  const task = await runPromise(taskBuilder.build())
  expect(task.name).toBe("taskName")
})

test("A wait instruction can be added", async () => {
  const taskBuilderWait = taskBuilder.addWait(root, 0.5)
  const task = await runPromise(taskBuilderWait.build())
  const start = Date.now()

  await runPromise(task.execute(notificationService, scriptsService, permissionsService, devicesService, token))
  expect(Date.now()).toBeGreaterThan(start + 0.5 * 1000)
})