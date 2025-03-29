import { DuplicateIdError, NotFoundError } from "../../src/ports/Repository.js"

test("DuplicateIdError message is constructed correcly", () => {
    const cause = "Device id 3 alredy in use"
    const err = DuplicateIdError(cause)
    expect(err.cause).toBe(cause)
    expect(err.message).toBe("Id already in use")
})

test("DuplicateIdError does not need a cause", () => {
    const err = DuplicateIdError()
    expect(err.cause).toBe(undefined)
})

test("NotFoundError message is constructed correcly", () => {
    const cause = "Device with id 3 not found"
    const err = NotFoundError(cause)
    expect(err.cause).toBe(cause)
    expect(err.message).toBe("Not found")
})

test("NotFoundError does not need a cause", () => {
    const err = NotFoundError()
    expect(err.cause).toBe(undefined)
})