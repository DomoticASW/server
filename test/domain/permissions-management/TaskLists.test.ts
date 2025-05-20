import { TaskId } from "../../../src/domain/scripts-management/Script.js"
import { TaskLists } from "../../../src/domain/permissions-management/TaskLists.js"
import { Email } from "../../../src/domain/users-management/User.js"
 
 function makeTaskLists(id: string = "1") {
    return TaskLists(TaskId(id), [], [])
 }
 
 test("TaskLists testing field", () => {
    expect(makeTaskLists().id).toBe("1")
    expect(makeTaskLists().blacklist).toEqual([])
    expect(makeTaskLists().whitelist).toEqual([])
  })

  test("TaskLists try to add email to blacklist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")
    taskLists.addEmailToBlacklist(email)
    expect(taskLists.blacklist).toHaveLength(1)
    expect(taskLists.blacklist).toEqual([email])
  })

  test("TaskLists try to add email to whitelist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")
    taskLists.addEmailToWhitelist(email)
    expect(taskLists.whitelist).toHaveLength(1)
    expect(taskLists.whitelist).toEqual([email])
  })

  test("TaskLists try to add email to blacklist that is already in whitelist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")
    taskLists.addEmailToWhitelist(email)
    taskLists.addEmailToBlacklist(email)
    expect(taskLists.whitelist).toHaveLength(1)
    expect(taskLists.blacklist).toHaveLength(0)
  })

  test("TaskLists try to add email to whitelist that is already in blacklist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")
    taskLists.addEmailToBlacklist(email)
    taskLists.addEmailToWhitelist(email)
    expect(taskLists.blacklist).toHaveLength(1)
    expect(taskLists.whitelist).toHaveLength(0)
  })

  test("TaskLists try to remove email from blacklist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")

    taskLists.addEmailToBlacklist(email)
    expect(taskLists.blacklist).toHaveLength(1)
    taskLists.removeEmailFromBlacklist(email)
    expect(taskLists.blacklist).toHaveLength(0)
  })

  test("TaskLists try to remove email from whitelist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")

    taskLists.addEmailToWhitelist(email)
    expect(taskLists.whitelist).toHaveLength(1)
    taskLists.removeEmailFromWhitelist(email)
    expect(taskLists.whitelist).toHaveLength(0)
  })

  test("TaskLists try to add duplicate email to blacklist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")

    taskLists.addEmailToBlacklist(email)
    taskLists.addEmailToBlacklist(email)
    expect(taskLists.blacklist).toHaveLength(1)
  })

  test("TaskLists try to add duplicate email to whitelist", () => {
    const taskLists = makeTaskLists()
    const email = Email("test@gmail.com")

    taskLists.addEmailToWhitelist(email)
    taskLists.addEmailToWhitelist(email)
    expect(taskLists.whitelist).toHaveLength(1)
  })