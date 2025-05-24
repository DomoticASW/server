import { EditList } from "../../../src/domain/permissions-management/EditList.js"
import { ScriptId, TaskId } from "../../../src/domain/scripts-management/Script.js";
import { Email } from "../../../src/domain/users-management/User.js"
 
function makeEditList(id: string = "1", users: Email[] = [Email("test@gmail.com")]): EditList {
  return EditList(TaskId(id), users)
}
 test("EditList testing field", () => {
    expect(makeEditList().id).toBe("1")
    expect(makeEditList().users).toHaveLength(1)
  })

  test("EditList try to add user to users", () => {
    const editList = makeEditList()
    const user = Email("test@gmail.com")
    editList.addUserToUsers(user)
    expect(editList.users).toHaveLength(1)
    expect(editList.users).toEqual([user])
  })

  test("EditList try to remove user from users", () => {
    const editList = makeEditList()
    const user = Email("test@gmail.com")

    editList.addUserToUsers(user)
    expect(editList.users).toHaveLength(1)
    editList.removeUserToUsers(user)
    expect(editList.users).toHaveLength(0)
  })

  test("EditList try to add duplicate user to users", () => {
    const editList = makeEditList()
    const user = Email("test@gmail.com")

    editList.addUserToUsers(user)
    editList.addUserToUsers(user)
    expect(editList.users).toHaveLength(1)
  })