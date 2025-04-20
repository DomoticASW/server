import { DuplicateIdError, NotFoundError } from "../../src/ports/users-management/Errors.js"

test("DuplicateIdError cause add correcly", () => {
  const cause = "Device id already taken"
  const err = DuplicateIdError(cause)
  expect(err.cause).toBe(cause)
})

test("NotFoundError cause add correcly", () => {
  const cause = "Device not found"
  const err = NotFoundError(cause)
  expect(err.cause).toBe(cause)
})