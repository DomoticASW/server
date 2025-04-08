import { AutomationId, TaskId } from "../../../src/domain/scripts-management/Script.js"

test("A taskId can be created", () => {
  const taskId = TaskId("1");
  expect(taskId).toBe("1")
})

test("An automationId can be created", () => {
  const automationId = AutomationId("1");
  expect(automationId).toBe("1")
})