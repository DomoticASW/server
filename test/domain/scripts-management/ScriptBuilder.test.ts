import { runPromise } from "effect/Effect"
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js"

test("A TaskBuilder can be created", async () => {
  const taskBuilder = TaskBuilder("taskName")
  const task = await runPromise(taskBuilder.build())
  expect(task.name).toBe("taskName")
})

