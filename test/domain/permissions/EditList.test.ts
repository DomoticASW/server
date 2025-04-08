import { EditList } from "../../../src/domain/permissions/EditList.js"
import { ScriptId } from "../../../src/domain/scripts-management/Script.js";
import { Email } from "../../../src/domain/users-management/User.js"
 
 function makeEditList(id: string = "1") {
    return EditList(ScriptId(id, "Task"))
 }
 
 test("ScriptId creation", () => {
    const scriptId = "1"
    const id = ScriptId(scriptId, "Task")
    expect(id).toBe(scriptId)
 })
 
 test("EditList testing field", () => {
    expect(makeEditList().id).toBe("1")
    expect(makeEditList().users).toEqual([])
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